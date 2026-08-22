"use client";
/* eslint-disable react/no-unescaped-entities, @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";

const modelNames=["GPT","Claude","Gemini","DeepSeek","Doubao","Kimi","GLM","Qwen","MiniMax","Grok","Llama","Mistral","Veo","Sora","Flux","Qwen-Code","GPT-Code","Claude-Code","Ark","OpenAI","Anthropic","Vertex","Azure","Bedrock"];
const words=["连接模型","聚合算力","统一接口","加速创造"];

export default function Landing(){
  const [word,setWord]=useState(0),[typed,setTyped]=useState("");
  useEffect(()=>{let i=0,back=false;const timer=setInterval(()=>{const w=words[word];if(!back){i++;setTyped(w.slice(0,i));if(i===w.length)back=true}else{i--;setTyped(w.slice(0,i));if(i===0){back=false;setWord(v=>(v+1)%words.length)} }},back?80:120);return()=>clearInterval(timer)},[word]);
  return <main className="landing">
    <div className="aurora"><i/><i/><i/></div><div className="cyber-grid"/><svg className="flow-lines" viewBox="0 0 1440 900" preserveAspectRatio="none"><path d="M-80 760 C280 160 780 120 1540 420"/><path d="M0 880 C420 260 860 300 1460 80"/><path d="M260 960 C520 390 1060 380 1560 650"/></svg>
    <div className="particles">{Array.from({length:34},(_,i)=><i key={i} style={{left:`${(i*37)%100}%`,top:`${(i*61)%96}%`,animationDelay:`-${(i*1.7)%20}s`,animationDuration:`${14+(i%9)}s`}}/>)}</div>
    <header className="landing-nav"><a className="landing-brand" href="/"><span className="gate-logo"><b>A</b></span><div><strong>星桥 AI</strong><small>AETHERGATE</small></div></a><nav><a href="#capabilities">能力</a><a href="#security">安全</a><a href="/v1/models">API</a><a href="/portal">用户中心</a><a href="/admin" className="nav-console">管理控制台 ↗</a></nav></header>
    <section className="landing-hero">
      <div className="orbit"><div className="orbit-track">{modelNames.map((n,i)=><div className="orbit-item" key={n} style={{transform:`rotate(${i*15}deg) translateX(410px) rotate(${-i*15}deg)`}}><span>{n.slice(0,2)}</span><small>{n}</small></div>)}</div></div>
      <div className="hero-copy"><span className="hero-pill">✦ 新一代 AI API 网关</span><h1>让每一个模型<br/><em>{typed}</em><b>|</b></h1><p>统一接入全球主流大模型，安全管理多提供商、多凭证、模型路由与成员额度。一个端点，连接无限智能。</p><div className="landing-actions"><a href="/portal" className="cta-primary">卡密登录 <span>→</span></a><a href="/admin" className="cta-ghost">管理控制台</a></div><div className="trust-strip"><span>◈ 密钥加密</span><span>◉ 流式转发</span><span>⌁ 智能路由</span><span>◎ D1 持久化</span></div></div>
      <div className="hero-metrics"><div><strong>20+</strong><small>提供商模板</small></div><div><strong>99.9%</strong><small>网关可用目标</small></div><div><strong>∞</strong><small>公共模型路由</small></div></div>
    </section>
    <section className="capabilities" id="capabilities"><div className="section-kicker">CONTROL PLANE</div><h2>不只是中转<br/><em>是你的模型控制平面</em></h2><div className="cap-grid"><article><span>01</span><i>◫</i><h3>多提供商管理</h3><p>一个协议与 Base URL 对应一个独立实例，凭证池、模型和计费互不混用。</p></article><article><span>02</span><i>⌁</i><h3>智能凭证调度</h3><p>优先级、并发余量、最少在途与权重分流，401 自动失效，429 智能冷却。</p></article><article><span>03</span><i>◇</i><h3>公共模型路由</h3><p>用稳定的公共模型名绑定多个上游，故障转移与预算边界由管理员明确控制。</p></article><article><span>04</span><i>◎</i><h3>用量与成本账本</h3><p>记录 Token、状态、路由和耗时，不保存提示词、回答或任何完整密钥。</p></article></div></section>
    <section className="security-section" id="security"><div><span className="section-kicker">SECURITY BY DEFAULT</span><h2>密钥只属于服务端</h2><p>上游密钥采用 AES-256-GCM 加密保存，成员 Key 仅存不可逆哈希。管理后台独立登录保护，公共 API 只接受成员令牌。</p><div className="security-list"><span>✓ 完整 Key 永不回显</span><span>✓ 管理操作全量审计</span><span>✓ 默认禁止跨计费池回退</span><span>✓ 全站紧急停止即时生效</span></div></div><div className="code-card"><div><i/><i/><i/><span>OpenAI compatible</span></div><pre><code><b>POST</b> /v1/chat/completions{"\n"}<em>Authorization:</em> Bearer sk-site-••••{"\n"}<em>Content-Type:</em> application/json{"\n\n"}{`{`} {"\n"}  <em>"model"</em>: <span>"your-public-model"</span>,{"\n"}  <em>"stream"</em>: <b>true</b>{"\n"}{`}`}</code></pre><div className="code-status"><span>● Gateway ready</span><small>Encrypted · Audited · Streamed</small></div></div></section>
    <footer><a className="landing-brand" href="/"><span className="gate-logo"><b>A</b></span><div><strong>星桥 AI</strong><small>AETHERGATE</small></div></a><p>A secure bridge to every model.</p><div><a href="/admin">控制台</a><a href="#security">安全</a><a href="/v1/models">API</a></div></footer>
  </main>
}
