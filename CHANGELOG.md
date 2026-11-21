# 更新日志

本项目遵循语义化版本（Semantic Versioning）。

## 1.3.0 · 2026-11-21

正式版发布。

- **更名**：包名与仓库统一改为 `dsh-server-pulse`；插件 ID、路由与命名空间统一为 `server-pulse`，API 路径为 `/api/server-pulse/*`。
- **端口收敛**：移除历史遗留的自定义探测端口，仅保留官方默认端口（Grafana 3000、Prometheus 9090、Uptime Kuma 3001、node_exporter 9100）。
- **配置健壮性**：加强目标 ID、连接参数与服务 URL 的校验，明确 SSH 别名与手填连接的互斥关系。
- **测试与 CI**：补齐单元与集成测试，接入 CI 检查，发布前可自动验证安装链路。
- **文档**：完善中文与英文 README，更新安装指南、架构说明及示例截图。

## 1.3.0-beta.1 · 2026-11-21

- 聚焦服务器监控。用本机 OpenSSH Host 别名替代 Remote SSH 插件连接引用，支持从面板选择别名并生成监控配置。
- 自动识别目标机常见端口上的 Grafana、Prometheus、Kuma 和 node_exporter。新增 Grafana 版本和数据库状态、Prometheus 版本以及 Kuma 公开状态页监控表。
- 更新双语首页、示例截图、安装指南和架构图。通过 GitHub URL 可直接安装。

## 1.2.0-beta.1 · 2026-11-21

- 支持用 `remoteSshProfile` 引用同一个 DSH profile 中保存的 Remote SSH 密钥连接，包含自定义端口和 ProxyJump。
- 首次打开可在直连与 Remote SSH 示例之间选择。主机卡片显示配置名称及 Remote SSH 来源。
- Host 按路由、目标解析、SSH 执行和 Linux 指标采集整理。增加回归测试、双语 README、架构和详细配置文档。

## 1.1.0-beta.1 · 2026-11-21

- 第一个公开试装包。支持从空配置添加服务器、测试 SSH、查看每台机器的资源和告警。
- 支持独立配置 Grafana、Prometheus、Uptime Kuma 与 node_exporter 的探测地址。
- 进程排行显示进程名称、PID、CPU 和内存。
