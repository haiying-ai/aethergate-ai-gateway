import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "星桥 AI · AetherGate",
  description: "安全连接每一个模型：多提供商 API 网关、凭证池、模型路由、成员额度与流式转发。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
