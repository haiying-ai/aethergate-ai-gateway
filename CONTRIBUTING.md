# 参与贡献

AI 网关：OpenAI 协议兼容、多上游路由、成员密钥、配额与用量结算。改动面集中在 **路由/配额/计费** 三处，这三处出错的代价是"账对不上"或"额度被绕过"。

## 环境

- Node.js `>=22.13.0`
- 一个 D1（SQLite）绑定，在 `.openai/hosting.json` 中声明为 `DB`

```bash
npm run install:ci
npm run db:generate   # 改完 db/schema.ts 后生成迁移
npm test              # 配额策略、路由、用量计量、权益额度
npm run dev
```

## 改动时的硬约束

1. **账本不可跳过**：任何一次转发都必须写 `usage_ledger`，失败也要留痕（含失败原因），不允许"先返回再记账"
2. **`baseUrl` 是拼接出来的 = SSRF 面**：上游地址只允许来自 `providers` 表，且必须是 http/https；`redirect: manual` 不要改成跟随
3. **价格是版本化的**：计费读 `model_price_versions` 的生效版本，不要在代码里写死单价
4. **密钥只存哈希**：`member_api_keys` 只保存摘要，明文只在创建时返回一次

## 提 PR

- 涉及计费与配额的改动，请说明并发与失败路径下的行为
- 涉及 schema 变更请附迁移
- 说明本地 `npm test` 结果

上游 `QuantumNous/new-api` 与本仓库是同类产品但无代码关系（Go vs TypeScript），提交时请不要引入其源码片段。

安全问题请走 **Security** 页私密报告。
