"use client";

import { useEffect, useMemo, useState } from "react";

type Provider = { id: string; name: string; platform: string; protocol: string; baseUrl: string; status: string; credentialCount: number; availableCredentials: number; modelCount: number; billingType: string };
type Snapshot = { gatewayEnabled: boolean; providers: Provider[]; stats: { providers: number; healthyProviders: number; credentials: number; models: number; members: number; callsToday: number; successRate: number; activeLeases: number }; events: { id: string; level: string; summary: string; createdAt: string }[] };

const navigation = [
  ["overview", "概览", "⌁"], ["providers", "模型提供商", "◫"], ["models", "模型与价格", "◇"],
  ["members", "成员管理", "♙"], ["invites", "邀请管理", "✉"], ["limits", "额度与流量", "◌"],
  ["calls", "调用记录", "≋"], ["alerts", "告警中心", "△"], ["audit", "审计日志", "⌘"], ["settings", "系统设置", "⚙"],
];

const templates = [
  { name: "OpenAI 官方", platform: "OpenAI", protocol: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { name: "火山 Agent Plan · OpenAI", platform: "火山 Agent Plan", protocol: "OpenAI Compatible", baseUrl: "https://ark.cn-beijing.volces.com/api/plan/v3" },
  { name: "火山 Agent Plan · Anthropic", platform: "火山 Agent Plan", protocol: "Anthropic Compatible", baseUrl: "https://ark.cn-beijing.volces.com/api/plan" },
  { name: "火山 Coding Plan · OpenAI", platform: "火山 Coding Plan", protocol: "OpenAI Compatible", baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3" },
  { name: "火山 Coding Plan · Anthropic", platform: "火山 Coding Plan", protocol: "Anthropic Compatible", baseUrl: "https://ark.cn-beijing.volces.com/api/coding" },
  { name: "火山方舟标准 API", platform: "火山方舟", protocol: "OpenAI Compatible", baseUrl: "https://ark.cn-beijing.volces.com/api/v3" },
];

const empty: Snapshot = { gatewayEnabled: true, providers: [], stats: { providers: 0, healthyProviders: 0, credentials: 0, models: 0, members: 0, callsToday: 0, successRate: 100, activeLeases: 0 }, events: [] };

export default function Home() {
  const [active, setActive] = useState("overview");
  const [data, setData] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"provider" | "member" | "credential" | "model" | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [notice, setNotice] = useState("");

  async function refresh() {
    try { const res = await fetch("/api/control-plane", { cache: "no-store" }); if (res.ok) setData(await res.json()); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function action(payload: Record<string, unknown>) {
    const res = await fetch("/api/control-plane", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await res.json() as { error?: string; apiKey?: string };
    if (!res.ok) return setNotice(result.error || "操作失败");
    setModal(null); setNotice(result.apiKey ? `个人 API Key（仅显示一次）：${result.apiKey}` : "保存成功"); await refresh();
  }

  const title = useMemo(() => navigation.find(n => n[0] === active)?.[1] || "概览", [active]);

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brandmark">N</span><div><strong>New API</strong><small>CONTROL PLANE</small></div></div>
      <nav>{navigation.map(([id, label, icon]) => <button key={id} onClick={() => setActive(id)} className={active === id ? "active" : ""}><span>{icon}</span>{label}{id === "alerts" && data.events.length > 0 && <b>{data.events.length}</b>}</button>)}</nav>
      <div className="sidebar-foot"><span className="live-dot"/><div><strong>私有控制台</strong><small>D1 数据已持久化</small></div></div>
    </aside>
    <section className="workspace">
      <header><div><p>API 网关管理系统</p><h1>{title}</h1></div><div className="header-actions"><span className={data.gatewayEnabled ? "gateway on" : "gateway off"}>● 网关{data.gatewayEnabled ? "运行中" : "已停止"}</span><button className="icon-button">⌕</button><button className="avatar">孙</button></div></header>
      {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
      {active === "overview" && <Overview data={data} loading={loading} onGo={setActive} onAdd={() => setModal("provider")} onToggle={() => action({ action: "toggle-gateway", enabled: !data.gatewayEnabled })}/>} 
      {active === "providers" && <Providers data={data} onAdd={() => setModal("provider")} onCredential={p => {setSelectedProvider(p);setModal("credential")}} onModel={p => {setSelectedProvider(p);setModal("model")}} onTest={p => action({action:"test-provider",providerId:p.id})}/>} 
      {active !== "overview" && active !== "providers" && <ModulePage active={active} data={data} onAddMember={() => setModal("member")}/>} 
    </section>
    {modal === "provider" && <div className="modal-backdrop"><form className="modal" onSubmit={e => { e.preventDefault(); const t = templates[selectedTemplate]; action({ action: "create-provider", ...t, name: new FormData(e.currentTarget).get("name") || t.name, billingType: new FormData(e.currentTarget).get("billingType") }); }}><div className="modal-head"><div><small>新建连接</small><h2>添加模型提供商</h2></div><button type="button" onClick={() => setModal(null)}>×</button></div><label>平台模板<select value={selectedTemplate} onChange={e => setSelectedTemplate(Number(e.target.value))}>{templates.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}</select></label><div className="template-preview"><span>{templates[selectedTemplate].protocol}</span><code>{templates[selectedTemplate].baseUrl}</code></div><label>提供商名称<input name="name" defaultValue={templates[selectedTemplate].name}/></label><label>计费类型<select name="billingType"><option value="subscription">套餐 / AFP</option><option value="metered">按量计费</option><option value="internal">内部点数</option></select></label><p className="safe-note">连接创建后进入“待验证”状态。自定义地址必须通过 HTTPS 与公网地址安全校验。</p><div className="modal-actions"><button type="button" onClick={() => setModal(null)}>取消</button><button className="primary">创建提供商</button></div></form></div>}
    {modal === "member" && <div className="modal-backdrop"><form className="modal" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); action({ action: "create-member", name: f.get("name"), email: f.get("email") }); }}><div className="modal-head"><div><small>访问控制</small><h2>添加成员</h2></div><button type="button" onClick={() => setModal(null)}>×</button></div><label>成员名称<input name="name" required placeholder="例如：开发组"/></label><label>邮箱<input name="email" type="email" placeholder="name@example.com"/></label><p className="safe-note">系统将创建一个个人 API Key，完整 Key 只会显示一次，数据库仅保存不可逆哈希。</p><div className="modal-actions"><button type="button" onClick={() => setModal(null)}>取消</button><button className="primary">创建成员与 Key</button></div></form></div>}
    {modal === "credential" && selectedProvider && <div className="modal-backdrop"><form className="modal" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);action({action:"add-credential",providerId:selectedProvider.id,name:f.get("name"),apiKey:f.get("apiKey")})}}><div className="modal-head"><div><small>{selectedProvider.name}</small><h2>添加上游 API Key</h2></div><button type="button" onClick={()=>setModal(null)}>×</button></div><label>Key 名称<input name="name" defaultValue="主 Key" required/></label><label>API Key<input name="apiKey" type="password" autoComplete="off" required placeholder="保存后不可查看明文"/></label><p className="safe-note">密钥使用 AES-256-GCM 加密保存；页面、接口和审计日志只保留脱敏前缀。</p><div className="modal-actions"><button type="button" onClick={()=>setModal(null)}>取消</button><button className="primary">加密保存</button></div></form></div>}
    {modal === "model" && selectedProvider && <div className="modal-backdrop"><form className="modal" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);action({action:"create-model",providerId:selectedProvider.id,upstreamModelId:f.get("upstreamModelId"),publicName:f.get("publicName"),contextWindow:Number(f.get("contextWindow"))})}}><div className="modal-head"><div><small>{selectedProvider.name}</small><h2>添加模型与公共路由</h2></div><button type="button" onClick={()=>setModal(null)}>×</button></div><label>上游模型 ID<input name="upstreamModelId" required placeholder="deepseek-v4-pro"/></label><label>公共模型名<input name="publicName" required placeholder="deepseek-v4-pro"/></label><label>上下文长度<input name="contextWindow" type="number" defaultValue="128000"/></label><p className="safe-note">默认只建立当前提供商路由，不允许跨提供商或跨计费池故障转移。</p><div className="modal-actions"><button type="button" onClick={()=>setModal(null)}>取消</button><button className="primary">创建模型</button></div></form></div>}
  </main>;
}

function Overview({ data, loading, onGo, onAdd, onToggle }: { data: Snapshot; loading: boolean; onGo: (v:string)=>void; onAdd:()=>void; onToggle:()=>void }) {
  const s = data.stats;
  const cards = [["提供商", `${s.healthyProviders}/${s.providers}`, "正常 / 总数", "providers"], ["可用凭证", s.credentials, "加密存储", "providers"], ["已启用模型", s.models, "公共模型路由", "models"], ["今日调用", s.callsToday, `${s.successRate}% 成功率`, "calls"], ["当前并发", s.activeLeases, "自动租约回收", "limits"]];
  return <div className="content"><section className="hero"><div><span className="eyebrow">SYSTEM OVERVIEW</span><h2>网关状态一目了然</h2><p>提供商、密钥池、路由、额度和审计集中管理，默认采用最严格限制。</p></div><div className="hero-actions"><button onClick={onAdd} className="primary">＋ 添加提供商</button><button onClick={onToggle} className={data.gatewayEnabled ? "danger-soft" : "success-soft"}>{data.gatewayEnabled ? "紧急停止" : "恢复网关"}</button></div></section>
    <section className="stats">{cards.map(([label, value, sub, target]) => <button key={String(label)} onClick={() => onGo(String(target))}><small>{label}</small><strong>{loading ? "—" : value}</strong><span>{sub}</span></button>)}</section>
    <section className="grid-main"><article className="panel"><div className="panel-head"><div><small>PROVIDER HEALTH</small><h3>提供商健康度</h3></div><button onClick={() => onGo("providers")}>查看全部 →</button></div>{data.providers.length === 0 ? <Empty text="还没有提供商" action="添加第一个提供商" onClick={onAdd}/> : <div className="provider-health">{data.providers.slice(0,4).map(p => <div key={p.id}><span className={`status-dot ${p.status}`}/><div><strong>{p.name}</strong><small>{p.protocol} · {p.availableCredentials}/{p.credentialCount} Key 可用</small></div><b>{p.status === "healthy" ? "正常" : p.status === "disabled" ? "停用" : "待验证"}</b></div>)}</div>}</article>
      <article className="panel"><div className="panel-head"><div><small>ALERT CENTER</small><h3>需要关注</h3></div><button onClick={() => onGo("alerts")}>告警中心 →</button></div>{data.events.length === 0 ? <div className="all-clear"><span>✓</span><strong>暂无告警</strong><small>系统状态正常</small></div> : <div className="event-list">{data.events.slice(0,4).map(e => <div key={e.id}><span>!</span><div><strong>{e.summary}</strong><small>{e.createdAt}</small></div></div>)}</div>}</article></section>
    <section className="principles"><div><span>01</span><strong>密钥永不回显</strong><small>AES-GCM 密文 + 指纹校验</small></div><div><span>02</span><strong>限制逐层收紧</strong><small>全站到个人 Key 取最严格值</small></div><div><span>03</span><strong>默认禁止跨池回退</strong><small>避免意外产生按量费用</small></div><div><span>04</span><strong>不记录请求正文</strong><small>只保存用量、状态与耗时</small></div></section>
  </div>;
}

function Providers({ data, onAdd, onCredential, onModel, onTest }: { data: Snapshot; onAdd:()=>void; onCredential:(p:Provider)=>void; onModel:(p:Provider)=>void; onTest:(p:Provider)=>void }) { return <div className="content"><div className="toolbar"><div><span className="eyebrow">UPSTREAM REGISTRY</span><h2>独立管理每个协议与 Base URL</h2><p>不同协议或地址始终创建为独立提供商，凭证池和计费池互不混用。</p></div><button className="primary" onClick={onAdd}>＋ 添加提供商</button></div><div className="table-card"><div className="table-filters"><button className="selected">全部 {data.providers.length}</button><button>正常 {data.stats.healthyProviders}</button><button>待验证 {data.providers.filter(p=>p.status==="pending").length}</button><input placeholder="搜索提供商…"/></div>{data.providers.length === 0 ? <Empty text="提供商列表为空" action="从内置模板创建" onClick={onAdd}/> : <div className="table-wrap"><table><thead><tr><th>提供商</th><th>协议 / Base URL</th><th>凭证</th><th>模型</th><th>计费</th><th>状态</th><th>操作</th></tr></thead><tbody>{data.providers.map(p => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.platform}</small></td><td><span>{p.protocol}</span><code>{p.baseUrl}</code></td><td>{p.availableCredentials}/{p.credentialCount} 可用</td><td>{p.modelCount} 个</td><td><span className="pill">{p.billingType === "subscription" ? "套餐" : "按量"}</span></td><td><span className={`status ${p.status}`}>● {p.status === "healthy" ? "正常" : "待验证"}</span></td><td><div className="row-actions"><button onClick={()=>onCredential(p)}>＋Key</button><button onClick={()=>onModel(p)}>＋模型</button><button onClick={()=>onTest(p)}>测试</button></div></td></tr>)}</tbody></table></div>}</div></div> }

function ModulePage({ active, data, onAddMember }: { active:string; data:Snapshot; onAddMember:()=>void }) {
  const config: Record<string, [string,string,string[]]> = {
    models:["公共模型与价格","公共名称与上游模型解耦；价格修改会产生不可变版本。",["公共模型","上游路由","能力参数","价格版本"]], members:["成员与个人 API Key","权限、额度、速率和并发可逐层收紧。",["正常成员","个人 Key","本月用量","并发占用"]], invites:["邀请管理","一次性邀请绑定默认模型权限与额度策略。",["未兑换","已兑换","已过期","已撤销"]], limits:["额度与流量控制","全站到个人 Key 的限制叠加后取最严格值。",["全站并发","RPM","TPM","月度预算"]], calls:["调用记录与账本","只记录用量、状态、路由和耗时，不保存提示词或回答。",["今日请求","成功率","输入 Token","输出 Token"]], alerts:["告警中心","密钥、预算、路由、并发和结算异常集中处理。",["严重","警告","待处理","已恢复"]], audit:["审计日志","敏感操作保留变更摘要，不记录任何密钥明文。",["今日操作","密钥变更","权限变更","失败操作"]], settings:["系统设置","网关开关、安全策略与全站默认限制。",["安全策略","网关设置","日志策略","密钥版本"]],
  };
  const [title, desc, metrics] = config[active] || config.models;
  return <div className="content"><div className="toolbar"><div><span className="eyebrow">CONTROL MODULE</span><h2>{title}</h2><p>{desc}</p></div>{active === "members" && <button className="primary" onClick={onAddMember}>＋ 添加成员</button>}</div><section className="metric-row">{metrics.map((m,i)=><div key={m}><small>{m}</small><strong>{active === "members" && i===0 ? data.stats.members : active === "calls" && i===0 ? data.stats.callsToday : "0"}</strong><span>实时统计</span></div>)}</section><article className="panel module-panel"><div className="module-graphic"><span>{navigation.find(n=>n[0]===active)?.[2]}</span></div><h3>{title}已就绪</h3><p>数据结构、权限边界和审计字段已经建立。新增记录后，这里将显示完整的列表、穿透详情和状态操作。</p><div className="feature-tags">{metrics.map(m=><span key={m}>✓ {m}</span>)}</div></article></div>;
}

function Empty({ text, action, onClick }: { text:string; action:string; onClick:()=>void }) { return <div className="empty"><span>＋</span><strong>{text}</strong><button onClick={onClick}>{action}</button></div> }
