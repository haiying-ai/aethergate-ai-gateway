import { env } from "cloudflare:workers";
import { count, desc, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "../../../db";
import { auditLogs, concurrencyLeases, healthEvents, memberApiKeys, members, modelRoutes, providerCredentials, providerModels, providers, publicModels, systemSettings, usageLedger } from "../../../db/schema";

export const dynamic = "force-dynamic";

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (value:string) => Uint8Array.from(atob(value), c=>c.charCodeAt(0));

async function actor() { const h = await headers(); return h.get("oai-authenticated-user-email") || "site-owner"; }
async function assertAdmin(){const email=(await actor()).toLowerCase();const allow=((env as unknown as {ADMIN_EMAILS?:string}).ADMIN_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);if(!email||!allow.includes(email))throw new Error("ADMIN_UNAUTHORIZED");return email}
async function digest(value: string) { return b64(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)))); }
async function encryptionKey() {
  const secret = (env as unknown as { CREDENTIAL_MASTER_KEY?: string }).CREDENTIAL_MASTER_KEY;
  if (!secret || secret.length < 32) throw new Error("尚未配置凭证主加密密钥");
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", enc.encode(secret)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encrypt(value: string) { const nonce = crypto.getRandomValues(new Uint8Array(12)); const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, await encryptionKey(), enc.encode(value)); return { encryptedValue: b64(new Uint8Array(ciphertext)), nonce: b64(nonce) }; }
async function decrypt(value:string,nonce:string){ return dec.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(nonce)},await encryptionKey(),unb64(value))); }
function safeHttpsUrl(raw: string) { const url = new URL(raw); if (url.protocol !== "https:") throw new Error("Base URL 必须使用 HTTPS"); const host = url.hostname.toLowerCase(); if (host === "localhost" || host.endsWith(".local") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "metadata.google.internal") throw new Error("Base URL 不能指向本机、内网或元数据地址"); return url.origin + url.pathname.replace(/\/$/, ""); }

export async function GET() {
  try {
    await assertAdmin();
    const db = getDb();
    await db.delete(concurrencyLeases).where(sql`${concurrencyLeases.expiresAt} < datetime('now')`);
    const providerRows = await db.select().from(providers).orderBy(desc(providers.createdAt));
    const credentialRows = await db.select({ providerId: providerCredentials.providerId, status: providerCredentials.status, total: count() }).from(providerCredentials).where(isNull(providerCredentials.deletedAt)).groupBy(providerCredentials.providerId, providerCredentials.status);
    const modelRows = await db.select({ providerId: providerModels.providerId, total: count() }).from(providerModels).where(eq(providerModels.status, "enabled")).groupBy(providerModels.providerId);
    const map = providerRows.map(p => { const creds = credentialRows.filter(c => c.providerId === p.id); return { id:p.id,name:p.name,platform:p.platform,protocol:p.protocol,baseUrl:p.baseUrl,status:p.status,billingType:p.billingType,credentialCount:creds.reduce((n,c)=>n+c.total,0),availableCredentials:creds.filter(c=>c.status==="available").reduce((n,c)=>n+c.total,0),modelCount:modelRows.find(m=>m.providerId===p.id)?.total||0 }; });
    const [memberCount] = await db.select({ value: count() }).from(members).where(eq(members.status,"active"));
    const [callCount] = await db.select({ value: count() }).from(usageLedger).where(sql`${usageLedger.createdAt} >= date('now')`);
    const [successCount] = await db.select({ value: count() }).from(usageLedger).where(sql`${usageLedger.createdAt} >= date('now') AND ${usageLedger.status} = 'success'`);
    const [leaseCount] = await db.select({ value: count() }).from(concurrencyLeases);
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key,"gateway_enabled")).limit(1);
    const events = await db.select({ id:healthEvents.id,level:healthEvents.level,summary:healthEvents.summary,createdAt:healthEvents.createdAt }).from(healthEvents).orderBy(desc(healthEvents.createdAt)).limit(8);
    const calls = callCount?.value||0;
    return Response.json({ gatewayEnabled: setting?.value !== "false", providers: map, stats:{ providers:map.length, healthyProviders:map.filter(p=>p.status==="healthy").length, credentials:map.reduce((n,p)=>n+p.availableCredentials,0), models:modelRows.reduce((n,m)=>n+m.total,0), members:memberCount?.value||0, callsToday:calls, successRate:calls ? Math.round(((successCount?.value||0)/calls)*1000)/10 : 100, activeLeases:leaseCount?.value||0 }, events });
  } catch (error) { const message=error instanceof Error?error.message:"读取失败";return Response.json({ error:message==="ADMIN_UNAUTHORIZED"?"无权访问管理接口":message }, { status:message==="ADMIN_UNAUTHORIZED"?403:500 }); }
}

export async function POST(request: Request) {
  try {
    await assertAdmin();
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action || ""); const db = getDb(); const user = await actor(); const now = new Date().toISOString();
    if (action === "toggle-gateway") { const enabled = Boolean(payload.enabled); await db.insert(systemSettings).values({ key:"gateway_enabled",value:String(enabled),updatedAt:now }).onConflictDoUpdate({ target:systemSettings.key,set:{value:String(enabled),updatedAt:now} }); await db.insert(auditLogs).values({ id:crypto.randomUUID(),actor:user,action:enabled?"gateway.enable":"gateway.stop",objectType:"system",summary:enabled?"恢复全站网关":"执行全站紧急停止" }); return Response.json({ ok:true }); }
    if (action === "create-provider") { const id=crypto.randomUUID(); const baseUrl=safeHttpsUrl(String(payload.baseUrl||"")); const protocol=String(payload.protocol||""); await db.insert(providers).values({ id,name:String(payload.name||"未命名提供商").slice(0,80),platform:String(payload.platform||"自定义"),protocol,baseUrl,chatPath:protocol.includes("Anthropic")?"/v1/messages":"/chat/completions",responsesPath:protocol.includes("Anthropic")?null:"/responses",modelsPath:"/models",billingType:String(payload.billingType||"metered"),status:"pending" }); await db.insert(auditLogs).values({ id:crypto.randomUUID(),actor:user,action:"provider.create",objectType:"provider",objectId:id,summary:`创建提供商：${String(payload.name||"").slice(0,80)}` }); return Response.json({ ok:true,id },{status:201}); }
    if (action === "add-credential") { const value=String(payload.apiKey||""); if(value.length<8) throw new Error("API Key 格式无效"); const sealed=await encrypt(value); const id=crypto.randomUUID(); await db.insert(providerCredentials).values({ id,providerId:String(payload.providerId),name:String(payload.name||"默认 Key"),...sealed,prefix:`${value.slice(0,5)}…${value.slice(-3)}`,fingerprint:await digest(value),status:"pending" }); await db.insert(auditLogs).values({ id:crypto.randomUUID(),actor:user,action:"credential.create",objectType:"provider_credential",objectId:id,summary:"新增加密上游凭证（明文未记录）" }); return Response.json({ok:true,id},{status:201}); }
    if (action === "create-model") { const providerId=String(payload.providerId||""); const upstream=String(payload.upstreamModelId||"").trim(); const publicName=String(payload.publicName||"").trim(); if(!providerId||!upstream||!publicName)throw new Error("模型信息不完整"); const providerModelId=crypto.randomUUID(); await db.insert(providerModels).values({id:providerModelId,providerId,upstreamModelId:upstream,displayName:upstream,contextWindow:Number(payload.contextWindow)||128000}); let [pub]=await db.select().from(publicModels).where(eq(publicModels.name,publicName)).limit(1); if(!pub){pub={id:crypto.randomUUID(),name:publicName,description:null,status:"enabled",createdAt:now,updatedAt:now};await db.insert(publicModels).values(pub)} await db.insert(modelRoutes).values({id:crypto.randomUUID(),publicModelId:pub.id,providerModelId,priority:10,weight:100,allowFailover:false,status:"enabled"}); await db.insert(auditLogs).values({id:crypto.randomUUID(),actor:user,action:"model.create",objectType:"provider_model",objectId:providerModelId,summary:`创建模型路由：${publicName} → ${upstream}`}); return Response.json({ok:true,id:providerModelId},{status:201}); }
    if (action === "test-provider") { const providerId=String(payload.providerId||""); const [provider]=await db.select().from(providers).where(eq(providers.id,providerId)).limit(1); const [credential]=await db.select().from(providerCredentials).where(sql`${providerCredentials.providerId}=${providerId} AND ${providerCredentials.deletedAt} IS NULL AND ${providerCredentials.status} IN ('pending','available','cooldown')`).orderBy(providerCredentials.priority).limit(1); if(!provider||!credential)throw new Error("请先添加上游 API Key"); const key=await decrypt(credential.encryptedValue,credential.nonce); let response:Response; try{response=await fetch(`${provider.baseUrl}${provider.modelsPath||"/models"}`,{headers:{authorization:`Bearer ${key}`},redirect:"manual"})}catch{throw new Error("连接上游失败")}; if(response.ok){await db.update(providerCredentials).set({status:"available",lastSuccessAt:now,lastError:null}).where(eq(providerCredentials.id,credential.id));await db.update(providers).set({status:"healthy",updatedAt:now}).where(eq(providers.id,providerId));await db.insert(healthEvents).values({id:crypto.randomUUID(),providerId,credentialId:credential.id,level:"info",eventType:"health.recovered",summary:`${provider.name} 连接测试成功`});return Response.json({ok:true})} const message=`${response.status}：上游连接测试失败`;await db.update(providerCredentials).set({status:response.status===401?"invalid":"pending",lastError:message}).where(eq(providerCredentials.id,credential.id));await db.update(providers).set({status:"unavailable",updatedAt:now}).where(eq(providers.id,providerId));await db.insert(healthEvents).values({id:crypto.randomUUID(),providerId,credentialId:credential.id,level:"error",eventType:"health.failed",summary:`${provider.name} ${message}`});throw new Error(message); }
    if (action === "create-member") { const memberId=crypto.randomUUID(); const raw=`sk-site-${crypto.randomUUID().replaceAll("-","")}${crypto.randomUUID().replaceAll("-","").slice(0,12)}`; await db.insert(members).values({id:memberId,name:String(payload.name||"成员").slice(0,80),email:String(payload.email||"").slice(0,160)||null}); await db.insert(memberApiKeys).values({id:crypto.randomUUID(),memberId,name:"默认 Key",prefix:`${raw.slice(0,12)}…`,secretHash:await digest(raw)}); await db.insert(auditLogs).values({id:crypto.randomUUID(),actor:user,action:"member.create",objectType:"member",objectId:memberId,summary:`创建成员：${String(payload.name||"").slice(0,80)}`}); return Response.json({ok:true,apiKey:raw},{status:201}); }
    return Response.json({ error:"未知操作" },{status:400});
  } catch(error) { const message=error instanceof Error?error.message:"操作失败";return Response.json({ error:message==="ADMIN_UNAUTHORIZED"?"无权访问管理接口":message },{status:message==="ADMIN_UNAUTHORIZED"?403:400}); }
}
