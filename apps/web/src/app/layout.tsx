import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Traceframe",
  description: "Bangumi library → Anitabi presence → city-day pilgrimage planner",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="topbar">
            <a className="brand" href="/">
              Traceframe
            </a>
            <nav className="nav">
              <a href="/presence">Presence</a>
              <a href="/library">Library</a>
              <a href="/trips">Trip</a>
              <a href="/api/health">Health</a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <p>
              地图数据来自{" "}
              <a href="https://anitabi.cn" rel="noopener noreferrer" target="_blank">
                Anitabi
              </a>{" "}
              贡献者，CC BY-NC-SA · 条目数据来自{" "}
              <a href="https://bgm.tv" rel="noopener noreferrer" target="_blank">
                Bangumi
              </a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
