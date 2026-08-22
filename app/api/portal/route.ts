import { count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { invitations, memberApiKeys, memberEntitlements, members, portalSessions, publicModels, usageLedger } from "../../../db/schema";
import { activeEntitlements, entitlementSummary } from "../entitlement-quota";

export const dynamic="force-dynamic";
const enc=new TextEncoder();
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const digest=async(value:string)=>b64(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))));
const cookieToken=(request:Request)=>(request.headers.get("cookie")||"").split(";").map(v=>v.trim()).find(v=>v.startsWith("aether_session="))?.split("=")[1]||"";

async function currentMember(request:Request){const token=cookieToken(request);if(!token)return null;const db=getDb();const [session]=await db.select().from(portalSessions).where(eq(portalSessions.tokenHash,await digest(token))).limit(1);if(!session||new Date(session.expiresAt).getTime()<=Date.now())return null;const [member]=await db.select().from(members).where(eq(members.id,session.memberId)).limit(1);return member?.status==="active"?member:null}
async function issueSession(memberId:string){const raw=crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");const expiresAt=new Date(Date.now()+30*86400000).toISOString();await getDb().insert(portalSessions).values({id:crypto.randomUUID(),memberId,tokenHash:await digest(raw),expiresAt});return {raw,expiresAt}}
const sessionCookie=(raw:string,maxAge=2592000)=>`aether_session=${raw}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function redeem(codeRaw:string,emailRaw:string){
  const db=getDb(),code=codeRaw.trim().toUpperCase(),email=emailRaw.trim().toLowerCase(),now=new Date().toISOString();
  if(!email||!email.includes("@"))throw new Error("请输入有效邮箱");
  const [card]=await db.select().from(invitations).where(eq(invitations.code,code)).limit(1);
  if(!card||card.status!=="pending")throw new Error("卡密无效或已被使用");
  if(new Date(card.expiresAt).getTime()<=Date.now()){await db.update(invitations).set({status:"expired",updatedAt:now}).where(eq(invitations.id,card.id));throw new Error("卡密已过期")}
  let [member]=await db.select().from(members).where(eq(members.email,email)).limit(1);
  if(!member){const id=crypto.randomUUID();await db.insert(members).values({id,name:email.split("@")[0],email,note:"card-member",monthlyRequestLimit:null,monthlyTokenLimit:null,rpmLimit:card.rpmLimit,concurrencyLimit:card.concurrencyLimit});[member]=await db.select().from(members).where(eq(members.id,id)).limit(1)}
  await db.insert(memberEntitlements).values({id:crypto.randomUUID(),memberId:member.id,invitationId:card.id,requestLimit:card.monthlyRequestLimit,tokenLimit:card.monthlyTokenLimit,startsAt:now,expiresAt:card.expiresAt});
  await db.update(invitations).set({status:"redeemed",email,redeemedAt:now,memberId:member.id,updatedAt:now}).where(eq(invitations.id,card.id));
  return member;
}

export async function GET(request:Request){
  const member=await currentMember(request);if(!member)return Response.json({error:"请先使用卡密登录"},{status:401});
  const db=getDb(),now=new Date().toISOString();
  const keys=await db.select({id:memberApiKeys.id,name:memberApiKeys.name,prefix:memberApiKeys.prefix,status:memberApiKeys.status,createdAt:memberApiKeys.createdAt}).from(memberApiKeys).where(eq(memberApiKeys.memberId,member.id)).orderBy(desc(memberApiKeys.createdAt));
  const entitlements=await db.select().from(memberEntitlements).where(eq(memberEntitlements.memberId,member.id)).orderBy(desc(memberEntitlements.expiresAt));
  const models=await db.select({id:publicModels.id,name:publicModels.name,description:publicModels.description}).from(publicModels).where(eq(publicModels.status,"enabled"));
  const active=activeEntitlements(entitlements,now);
  const summary=entitlementSummary(active);
  const startsAt=summary.startsAt||new Date(Date.now()-30*86400000).toISOString();
  const [usage]=await db.select({requests:count(),tokens:sql<number>`coalesce(sum(${usageLedger.inputTokens}+${usageLedger.outputTokens}),0)`}).from(usageLedger).where(sql`${usageLedger.memberId}=${member.id} AND unixepoch(${usageLedger.createdAt})>=unixepoch(${startsAt})`);
  return Response.json({member:{id:member.id,name:member.name,email:member.email},keys,entitlements,usage:{requests:usage?.requests||0,tokens:usage?.tokens||0},quota:{requests:summary.requestLimit,tokens:summary.tokenLimit,startsAt:summary.startsAt,expiresAt:summary.expiresAt},models,baseUrl:new URL(request.url).origin+"/v1"});
}

export async function POST(request:Request){
  try{
    const payload=await request.json() as Record<string,unknown>,action=String(payload.action||"");
    if(action==="redeem"){const member=await redeem(String(payload.code||""),String(payload.email||""));const session=await issueSession(member.id);return Response.json({ok:true},{headers:{"set-cookie":sessionCookie(session.raw)}})}
    if(action==="logout")return Response.json({ok:true},{headers:{"set-cookie":sessionCookie("",0)}});
    const member=await currentMember(request);if(!member)return Response.json({error:"登录已过期"},{status:401});const db=getDb();
    if(action==="redeem-more"){await redeem(String(payload.code||""),String(member.email||""));return Response.json({ok:true,message:"新卡密额度已到账"})}
    if(action==="create-key"){const raw=`sk-site-${crypto.randomUUID().replaceAll("-","")}${crypto.randomUUID().replaceAll("-","").slice(0,12)}`;await db.insert(memberApiKeys).values({id:crypto.randomUUID(),memberId:member.id,name:String(payload.name||"我的 API Key").slice(0,80),prefix:`${raw.slice(0,12)}…`,secretHash:await digest(raw)});return Response.json({ok:true,apiKey:raw,message:"API Key 仅显示这一次"},{status:201})}
    if(action==="delete-key"){const id=String(payload.id||"");await db.update(memberApiKeys).set({status:"revoked",updatedAt:new Date().toISOString()}).where(sql`${memberApiKeys.id}=${id} AND ${memberApiKeys.memberId}=${member.id}`);return Response.json({ok:true,message:"API Key 已删除"})}
    return Response.json({error:"未知操作"},{status:400});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"操作失败"},{status:400})}
}
