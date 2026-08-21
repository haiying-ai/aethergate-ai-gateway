import { env } from "cloudflare:workers";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import Dashboard from "./dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const allow = ((env as unknown as { ADMIN_EMAILS?: string }).ADMIN_EMAILS || "").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
  if (!allow.includes(user.email.toLowerCase())) return <main className="denied"><div><span>403</span><h1>无权访问控制台</h1><p>当前 ChatGPT 账号未加入管理员白名单。</p><a href={chatGPTSignOutPath("/")}>退出登录</a></div></main>;
  return <Dashboard />;
}
