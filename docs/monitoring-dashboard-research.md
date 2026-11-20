# DSH 服务器监控面板调研

2026-11-20。对照开源项目的一手文档、组件源码及插件现有的 SSH 快照和前端实现。以下布局与组件选择是针对 DSH 的设计判断。

## 开源项目的做法

- **Grafana Stat** 在小卡片上突出当前值或聚合值，可配一条迷你时间序列，并按阈值标示异常。DSH 已有 `MetricCard` 和 `Sparkline`。CPU、内存等百分比适合使用固定比例，容量和吞吐量则保留各自单位，以便用户理解变化幅度。[Grafana Stat 文档](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/stat/)
- **Uptime Kuma** 将 HTTP、TCP 等探测汇集在状态看板中，心跳条还提供可访问名称和无数据提示。DSH 可以借鉴紧凑状态行，每项显示服务名与探测结果。原有历史只有主机资源指标。此次为每轮快照补充探测结果，用于绘制服务心跳。[Uptime Kuma 项目](https://github.com/louislam/uptime-kuma) · [HeartbeatBar 源码](https://github.com/louislam/uptime-kuma/blob/master/src/components/HeartbeatBar.vue)
- **Prometheus / node_exporter** 把主机指标、Prometheus 就绪探测和抓取目标状态分别建模。DSH 的 SSH 采样状态、远端端口探测和 Prometheus 抓取计数也应使用不同标签，例如「采集在线」「探测通过」「抓取目标 8 正常／1 异常」。[Node Exporter 指南](https://prometheus.io/docs/guides/node-exporter/) · [Prometheus 管理 API](https://prometheus.io/docs/prometheus/latest/management_api/) · [目标 API](https://prometheus.io/docs/prometheus/latest/querying/api/#targets)
- **Netdata** 提供节点总览、单节点详情，以及按 CPU、内存、磁盘和网络等资源组织的图表。DSH 可以采用同样的信息层级，在顶部提供主机切换和异常概况，下方依次呈现资源摘要、存储、网络、进程、容器及系统细节。[Netdata Nodes](https://learn.netdata.cloud/docs/dashboards-and-charts/tabs/nodes) · [Netdata Metrics](https://learn.netdata.cloud/docs/dashboards-and-charts/tabs/metrics)

## 组件选择

| 选项 | 适用场景 | 对 DSH 的判断 |
| --- | --- | --- |
| 原生 HTML、现有 React 组件和 DSH CSS 变量 | 状态标签、摘要卡片、紧凑表格、短趋势 | 优先复用现有 `Card`、`MetricCard` 和宿主主题变量。当前模块由 DSH 加载并从宿主获取 React。 |
| shadcn/ui Chart、Table | 可组合图表、响应式表格 | 借鉴表头、数字对齐、图例和提示框结构。Chart 依赖 Recharts，现有 60 点快照采用原生短趋势即可。[Chart](https://ui.shadcn.com/docs/components/base/chart) · [Table](https://ui.shadcn.com/docs/components/base/table) |
| uPlot | 有较长历史、交互查看或多条时间序列的场景 | Canvas 2D 方案，可在后续具备长历史时对比。当前每台主机最多保留 60 点。[uPlot 项目](https://github.com/leeoniya/uPlot) |

## 布局和状态细节

1. 页首显示选中主机名、地址、采集状态、数据时间和刷新操作。首屏同时显示各主机的异常数和资源摘要，服务明细保留可读名称与状态。
2. 将活跃告警放在资源摘要上方，保留严重度顺序。磁盘仪表与告警使用同一组阈值。调研时两处起点分别为 75% 和 80%，恰好 90% 也存在边界差异。
3. 使用真实采样时间表达趋势间隔。面板保留上次成功数据时，明确标示历史快照，并区分成功采集时间与最近尝试时间。调研时失败分支更新 `sampledAt`，当时的历史只保存成功采样，最后一个点对应上次成功快照。此次在快照中单独记录该时间。
4. 用文字或形状补充颜色表达状态，键盘选中和聚焦应清晰可见。资源明细使用有表头的原生表格，窄屏允许在表格区域横向滚动。[WCAG 2.2 色彩使用](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) · [WCAG 2.2 非文本对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
