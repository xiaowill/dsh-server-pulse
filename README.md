# DSH Server Monitor

**在 DeepSeek Harness 里监控 SSH 能访问的 Linux 服务器。** 从本机 OpenSSH 配置选择主机，在一个面板看资源趋势、告警和服务器上已有的监控服务。

中文 · [English](README.en.md)

[下载试装包](https://github.com/xiaowill/dsh-server-monitor/releases/tag/v1.3.0-beta.1) · [安装与配置](docs/installation.md) · [项目架构](docs/architecture.md) · [更新日志](CHANGELOG.md)

![服务器监控总览，显示两台示例主机、CPU、内存、网络和磁盘趋势](docs/assets/dashboard.png)

*截图使用示例数据。* [SSH 主机选择](docs/assets/first-run.png) · [监控服务详情](docs/assets/services.png)

## 一条命令安装

已验证 **DSH `0.2.2-rc.5` 本机 Web profile**、OpenSSH 和 Linux 目标。

```sh
dsh plugin --profile web add https://github.com/xiaowill/dsh-server-monitor/releases/download/v1.3.0-beta.1/dsh-server-monitor-1.3.0-beta.1.tgz
dsh --profile web
```

从左侧栏打开「服务器监控」。也可以先下载 `.tgz`，安装到单独的试装 profile。[详细安装说明](docs/installation.md)

## 选一台 SSH 主机

1. 面板可列出本机 `~/.ssh/config` 及其 `Include` 文件中的具体 `Host` 别名。
2. 勾选要监控的主机，将生成的目标合并到当前 profile 的 `cordis.patch.yml`。空文件模板中的 `[]` 可直接替换。
3. 保存后点「刷新」和「测试 SSH」。实际连接由 OpenSSH 解析别名、用户、密钥、端口和 ProxyJump。

```yaml
- id: server-monitor
  config:
    targets:
      - id: app
        sshHost: my-linux-server
```

只采集明确加入 `targets` 的主机。浏览别名时，插件只读本机配置里的名字，既不发起 SSH，也不读取密钥文件。可以用手工填写的主机和用户名替代别名。

## 监控内容

| 页面 | 指标 |
| --- | --- |
| **总览** | 多机在线、告警、CPU、内存、负载和收发流量、磁盘读写趋势 |
| **计算与进程** | Linux PSI、PID 和 CPU／内存排行、GPU、容器与失败的 systemd 单元 |
| **存储与网络** | 挂载容量、inode、磁盘 IOPS 和延迟、网卡丢包、TCP 状态与重传 |
| **监控服务** | Grafana 版本和数据库状态，Prometheus 版本和抓取目标，Kuma 公开状态页的监控项、可用率与响应时间，以及 node_exporter 探测 |

服务从目标主机的常见本机端口发现，非标准端口或反向代理路径可单独配置。Kuma 监控项来自已发布的公开状态页。每台主机保留最近 60 次采样，断连时标出上次成功采样时间。[自定义服务地址与 Kuma 状态页](docs/installation.md#监控服务)

## 开发

```sh
npm run check
npm test
mkdir -p dist
npm pack --pack-destination dist
```

[架构与目录](docs/architecture.md) · [监控产品设计调研](docs/monitoring-dashboard-research.md) · [DSH 插件仓库调研](docs/dsh-plugin-repository-research.md) · [反馈问题](https://github.com/xiaowill/dsh-server-monitor/issues) · [MIT 许可证](LICENSE)
