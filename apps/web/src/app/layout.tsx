import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Traceframe — 动画巡礼行程规划",
    template: "%s · Traceframe",
  },
  description: "从 Bangumi 收藏找到 Anitabi 巡礼地图，并规划 1–3 天的城市行程。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbar-inner">
              <a className="brand" href="/" aria-label="Traceframe 首页">
                <span className="brand-mark" aria-hidden="true"><i /></span>
                <span>TRACEFRAME<small>巡礼行程手帖</small></span>
              </a>
              <nav className="nav" aria-label="主导航">
                <a href="/presence">发现</a>
                <a href="/library">收藏</a>
                <a href="/trips">行程</a>
              </nav>
              <a className="nav-cta" href="/trips/new">规划路线 <span aria-hidden="true">↗</span></a>
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="footer-inner">
              <div>
                <a className="footer-brand" href="/">TRACEFRAME</a>
                <p>把喜欢的故事，排进真实旅程。</p>
              </div>
              <p className="data-credit">
                地图数据来自 <a href="https://anitabi.cn" rel="noopener noreferrer" target="_blank">Anitabi</a> 贡献者，
                CC BY-NC-SA · 条目数据来自 <a href="https://bgm.tv" rel="noopener noreferrer" target="_blank">Bangumi</a>
              </p>
              <p className="footer-code">TF / 2026</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
