export default function DataPolicyPage() {
  return (
    <section className="hero">
      <h1>数据与许可政策</h1>
      <p>当前 MVP 仅保存作品级 Presence 元数据和 Anitabi 地图深链，不保存或转售 Anitabi 的 POI 明细、巡礼截图或离线数据包。</p>
      <p>Anitabi 内容标注为 CC BY-NC-SA 4.0；Bangumi 条目数据按其 API 规则使用。在取得书面商业授权或建立自有合法 POI 数据前，Traceframe 不启用付费规划、联盟营销或商业数据导出。</p>
      <p>Presence 刷新使用人工确认的候选集合。遇到 Cloudflare 403/挑战会立即停止，不轮换出口继续枚举。</p>
    </section>
  );
}
