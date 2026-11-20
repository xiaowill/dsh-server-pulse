# DSH 服务器监控

在 DeepSeek Harness 左侧栏查看 Linux 服务器的资源、告警和监控服务。基础指标通过只读 SSH 采集，每台服务器可以单独开启 Grafana、Prometheus、Uptime Kuma 或 node_exporter 探测。

## 从安装包开始

试用版面向本机运行的 DSH Web Host，兼容版本为 **0.2.2-rc.5**。运行 DSH 的机器需要 OpenSSH，并能连到目标 Linux 主机。

从下载 `.tgz` 的目录执行以下命令。它们创建一个独立的 Web profile，适合首次试装。

```sh
dsh --profile monitor-beta --from-default-profile web --dump-config
dsh plugin --profile monitor-beta add ./dsh-server-monitor-1.1.0-beta.1.tgz
dsh --profile monitor-beta
```

在 Web 界面从左侧栏打开「服务器监控」。首次安装时，面板显示「添加服务器」。保存主机配置前，插件不会发起 SSH 连接。

## 添加第一台服务器

1. 在运行 DSH 的机器上用自己的用户和密钥连一次服务器。第一次连接前，向服务器管理员核对 SSH 主机指纹。

   ```sh
   ssh -i ~/.ssh/id_ed25519 your-user@server.example.com
   ```

2. 把下面的条目加到 `~/.dsh/profiles/monitor-beta/cordis.patch.yml` 的 YAML 列表中。替换示例中的地址、用户和密钥路径。使用其他 profile 或设置了 `DSH_HOME` 时，修改对应目录的 `cordis.patch.yml`。

   ```yaml
   - id: server-monitor
     config:
       targets:
         - id: example
           label: 示例服务器
           host: server.example.com
           user: your-user
           keyPath: ~/.ssh/id_ed25519
   ```

3. 在面板点「刷新」，再点「测试 SSH」。成功后可直接看资源总览。测试会核对 SSH 认证和 Linux 采集所需的 `/proc` 文件，并报告连接耗时。启用了 SSH agent 的用户可以省略 `keyPath`。

每台主机有独立的 `id`。可按同样格式在 `targets` 下增加其他主机，或用 `port` 指定非默认 SSH 端口。使用非默认端口时，首次在终端核对指纹的命令也要加 `-p`。

## 配置监控服务

在目标主机的 `targets` 条目下，与 `host` 同级添加 `services`。每项 `url` 从**被监控的 Linux 主机**访问，应填写服务的 HTTP(S) 根地址，可包含反向代理前缀。可选的 `link` 会从你的浏览器打开。

```yaml
services:
  grafana:
    url: http://127.0.0.1:3000/grafana
    link: https://grafana.example.com/grafana
  prometheus:
    url: http://127.0.0.1:9090/prometheus
  uptime-kuma:
    url: http://127.0.0.1:3001
  node-exporter:
    url: http://127.0.0.1:9100
```

按实际部署替换地址，只填写需要探测的服务。插件会在根地址下访问 Grafana `/api/health`、Prometheus `/-/ready`、Kuma `/api/entry-page` 或 node_exporter `/metrics`。Prometheus 就绪后会查询活跃抓取目标。通过探测需要端点返回 HTTP 200，当前支持无需凭据的读接口，URL 中请勿填入密码、token 或查询参数。登录 Kuma 可查看各监控项的可用率和响应时间。

## 指标与采样

| 视图 | 指标 |
| --- | --- |
| 总览 | 多机状态、告警、样本时间、CPU、内存、负载、根分区和资源趋势 |
| 计算与进程 | Linux PSI、负载历史、CPU／内存进程排行、GPU、容器、内核和 systemd 失败单元 |
| 存储 | 文件系统容量、inode、读写速率、IOPS、平均读写延迟和进行中的 I/O |
| 网络 | 网卡收发、累计流量、丢包速率、TCP 状态和重传率 |
| 监控服务 | HTTP 探测耗时和历史，Prometheus 抓取状态、耗时与错误 |

每台主机保留最近 60 次采样，总览可暂停或手动刷新。用鼠标或在聚焦图表后用左右方向键查看历史。断连时面板显示上次成功样本及其时间。进程排行采集进程名和 PID，命令行参数不进入快照。浏览器通过仅限本机回环的接口读取监控数据。

配置可选的 `intervalMs`（默认 3000，最小 1000）、`connectTimeoutMs`（默认 8000，最小 2000）和 `sshPath`（默认 `/usr/bin/ssh`）。若面板显示指纹错误，在终端核对 `known_hosts` 与服务器管理员给的指纹。认证错误请核对账号、密钥或 agent。只有启用了对应内核能力、工具或权限的主机才会提供 PSI、GPU 和容器数据。

## 卸载试用版

先停止试装 profile，再执行以下命令。若已添加主机，随后从该 profile 的 `cordis.patch.yml` 移除 `id: server-monitor` 条目。

```sh
dsh plugin --profile monitor-beta remove dsh-server-monitor
```

布局和图表的参考来源见[监控面板调研](docs/monitoring-dashboard-research.md)。源代码采用 [MIT 许可证](LICENSE)。
