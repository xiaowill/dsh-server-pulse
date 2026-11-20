# 更新日志

## 1.2.0-beta.1 · 2026-11-21

- 支持用 `remoteSshProfile` 引用同一个 DSH profile 中保存的 Remote SSH 密钥连接，包含自定义端口和 ProxyJump。
- 首次打开可在直连与 Remote SSH 示例之间选择。主机卡片显示配置名称及 Remote SSH 来源。
- Host 按路由、目标解析、SSH 执行和 Linux 指标采集整理。增加回归测试、双语 README、架构和详细配置文档。

## 1.1.0-beta.1 · 2026-11-21

- 第一个公开试装包。支持从空配置添加服务器、测试 SSH、查看每台机器的资源和告警。
- 支持独立配置 Grafana、Prometheus、Uptime Kuma 与 node_exporter 的探测地址。
- 进程排行显示进程名称、PID、CPU 和内存。
