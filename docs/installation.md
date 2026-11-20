# 安装与配置

本版支持本机 DSH `0.2.2-rc.5` Web profile。DSH 所在机器需有 OpenSSH，目标为提供 Bash 与 `/proc` 的 Linux。监控服务探测使用目标机的 `curl`。

## 安装与卸载

```sh
dsh plugin --profile web add https://github.com/xiaowill/dsh-server-monitor/releases/download/v1.3.0-beta.1/dsh-server-monitor-1.3.0-beta.1.tgz
dsh --profile web
```

也可从 [Release](https://github.com/xiaowill/dsh-server-monitor/releases/tag/v1.3.0-beta.1) 下载 `.tgz`，然后从下载目录执行 `dsh plugin --profile web add ./dsh-server-monitor-1.3.0-beta.1.tgz`。

若要保留现有 Web 环境，可用 `dsh --profile monitor-beta --from-default-profile web --dump-config` 创建一个未使用的试装 profile。再将以上安装和启动命令中的 `web` 换成新名称。停止试装 profile 后，用 `dsh plugin --profile monitor-beta remove dsh-server-monitor` 卸载，并删除配置中对应的监控条目。

## 配置本机 SSH 别名

从 DSH 左侧栏打开「服务器监控」，在「本机 SSH 主机」勾选别名。将生成的条目加入 `~/.dsh/profiles/<profile>/cordis.patch.yml`。设置了 `DSH_HOME` 时，使用对应目录。已有 `server-monitor` 条目时，只合并其中的 `targets`，保留原有目标的服务配置。

```yaml
- id: server-monitor
  config:
    targets:
      - id: app
        label: 应用服务器
        sshHost: my-linux-server
```

别名来自本机 `~/.ssh/config` 中的具体 `Host` 条目，支持扫描 `Include` 文件。发现只列名字，OpenSSH 在实际连接时解释条件匹配、身份和跳板机。未列出的名称可手动写入 `sshHost`。在终端核对目标指纹后，回到面板点「刷新」，再点「测试 SSH」。

若没有 SSH 别名，可以改填 `host`、`user`，并按需填 `port`（默认 22）和 `keyPath`。省略密钥路径时，OpenSSH 使用 ssh-agent 或自己的身份配置。监控使用非交互式认证和严格主机指纹校验。

从 `1.2.0-beta.1` 升级时，将监控条目中的 `remoteSshProfile` 换为 `sshHost`，值为本机 OpenSSH 的 Host 别名。只有监控插件的目标配置需要迁移。

| 字段 | 用途 |
| --- | --- |
| `targets[].id` | 目标唯一标识 |
| `targets[].label` | 面板名称，可省略 |
| `targets[].sshHost` | 本机 OpenSSH Host 别名，与手填连接参数二选一 |
| `intervalMs` | Host 同一目标最小采样间隔，默认 3000，最小 1000 毫秒 |
| `connectTimeoutMs` | SSH 建连超时，默认 8000，最小 2000 毫秒 |
| `sshPath` | OpenSSH 可执行文件，默认 `/usr/bin/ssh` |

## 监控服务

由被监控的 Linux 主机访问其本机回环地址，只检查下表中的固定端口和端点。自动探测只列出识别到的服务。配置了明确 URL 的服务则始终有对应卡片，即使当前不可达。

| 服务 | 自动探测端口 | 可显示的服务数据 |
| --- | --- | --- |
| Grafana | 3000、19095 | `/api/health` 返回的版本与数据库健康 |
| Prometheus | 9090、19093 | 就绪状态、版本、抓取目标状态、耗时和错误 |
| Uptime Kuma | 3001 | Web 可达性与公开状态页的监控项、24 小时可用率和最近响应时间 |
| node_exporter | 9100 | `/metrics` 可达性和探测耗时 |

自定义端口和反代根路径可填在所选目标的 `services` 下。下面是目标的可选配置片段。

```yaml
services:
  grafana:
    url: http://127.0.0.1:3000/grafana
    link: https://grafana.example.com/grafana
  prometheus:
    url: http://127.0.0.1:9090/prometheus
  uptime-kuma:
    url: http://127.0.0.1:3001
    statusPage: infrastructure
```

`url` 是目标 Linux 主机可访问的服务根地址。`link` 是可选的浏览器入口。`statusPage` 填 Kuma 的公开页面 slug，默认尝试 `default`。只有端点开放匿名读取时才会显示对应数据。Kuma 的私有监控项可在 Kuma 自己的面板查看。

## 常见问题

| 现象 | 检查项 |
| --- | --- |
| 看不到 SSH 别名 | 确认 DSH 运行在保存 OpenSSH 配置的本机，检查 `Host` 与 `Include` |
| 保存后未出现目标 | 检查当前 DSH profile、`cordis.patch.yml` 的列表格式，再点刷新 |
| 指纹校验失败 | 在终端核对管理员提供的指纹、`known_hosts` 和跳板机 |
| 监控服务未识别 | 检查目标机上的端口、反代前缀与访问规则，自定义地址需填 `services` |
| Kuma 可达但没有监控项 | 核对是否发布了公开状态页以及 slug |
| 更改 SSH 别名指向后清空历史 | 重启 DSH，历史随 Host 进程存放 |
