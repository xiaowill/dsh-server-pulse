# DSH Server Monitor

**在 DeepSeek Harness 左侧栏查看 Linux 服务器的实时状态。** 支持多机切换、资源趋势、进程排行和监控服务探测。已经在 DSH 使用 Remote SSH 的用户，可以直接引用保存过的连接。

中文 · [English](README.en.md)

[下载试装包](https://github.com/xiaowill/dsh-server-monitor/releases/tag/v1.2.0-beta.1) · [安装与配置](docs/installation.md) · [项目架构](docs/architecture.md) · [更新日志](CHANGELOG.md)

![DSH Server Monitor 总览，显示两台示例主机、资源卡片与趋势图](docs/assets/dashboard.png)

*截图使用示例数据。*

## 快速安装

**已验证组合**为 DSH `0.2.2-rc.5` 的本机 Web profile、OpenSSH 客户端与 Linux 服务器。Remote SSH 联动另需在同一 profile 安装 `@zhangfengshun/dsh-remote-ssh@2.4.48`。

```sh
dsh plugin --profile web add https://github.com/xiaowill/dsh-server-monitor/releases/download/v1.2.0-beta.1/dsh-server-monitor-1.2.0-beta.1.tgz
dsh --profile web
```

从左侧栏打开「服务器监控」。首次打开会显示两种目标配置示例。已有服务器配置时，安装或更新后刷新面板。独立试装 profile、下载到本地后安装和卸载方法见[安装说明](docs/installation.md)。

## 连接第一台服务器

在当前 DSH profile 的 `cordis.patch.yml` 加入下面的条目。如果文件只有空列表 `[]`，用示例替换它。核对服务器的 SSH 主机指纹后，回到监控页点「刷新」和「测试 SSH」。

```yaml
- id: server-monitor
  config:
    targets:
      - id: app-server
        host: server.example.com
        user: your-user
        keyPath: ~/.ssh/id_ed25519
```

### 复用 Remote SSH 连接

在 Remote SSH 的「设置 → 远程连接」保存并测试一条**密钥认证**连接。用其名称或 ID 替代上面的 `host`、`user`、`keyPath`。

```yaml
- id: server-monitor
  config:
    targets:
      - id: app-server
        remoteSshProfile: My Linux server
```

Remote SSH 提供远程工作区、终端和文件操作。监控读取同一连接的地址、用户、端口、密钥路径和 ProxyJump，独立以只读 SSH 采集。只采集显式列入 `targets` 的连接，密码认证连接会提示改用密钥。[Remote SSH 项目](https://github.com/ZhangFengshun/dsh-remote-ssh) · [联动配置与排查](docs/installation.md#复用-remote-ssh-连接)

## 可以看到什么

| 页面 | 指标 |
| --- | --- |
| **总览** | 多机在线状态、数据时间、告警，以及 CPU、内存、收发流量和磁盘读写趋势 |
| **计算与进程** | Linux PSI、负载、进程 PID 与资源排行、GPU、容器和失败的 systemd 单元 |
| **存储** | 挂载容量、inode、读写速率、IOPS、延迟和进行中的 I/O |
| **网络流量** | 网卡收发、丢包速率、TCP 连接与重传 |
| **监控服务** | Grafana、Prometheus、Kuma 和 node_exporter 的探测记录，以及 Prometheus 抓取目标详情 |

每台主机保留最近 60 次采样。断连时保留上次成功数据并标明时间。采集 API 仅限本机访问，进程采样只含名称、PID、CPU 和内存。监控服务地址按主机配置，基础指标可直接通过 SSH 采集。[配置参考与排查](docs/installation.md)

## 开发

```sh
npm run check
npm test
mkdir -p dist
npm pack --pack-destination dist
```

[架构与目录](docs/architecture.md) · [开源监控设计调研](docs/monitoring-dashboard-research.md) · [DSH 插件仓库调研](docs/dsh-plugin-repository-research.md) · [反馈问题](https://github.com/xiaowill/dsh-server-monitor/issues)

[MIT License](LICENSE)
