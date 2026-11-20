# 安装与配置

本版本支持 DSH `0.2.2-rc.5`。DSH 所在机器需有 OpenSSH，目标 Linux 需能通过 SSH 访问，并提供 Bash 与 `/proc`。服务探测使用目标主机的 `curl`。进程、网卡、GPU 和容器等明细取决于相应系统工具及 SSH 用户的权限。

## 安装与卸载

直接安装 [GitHub Release 的预构建包](https://github.com/xiaowill/dsh-server-monitor/releases/tag/v1.2.0-beta.1)。

```sh
dsh plugin --profile web add https://github.com/xiaowill/dsh-server-monitor/releases/download/v1.2.0-beta.1/dsh-server-monitor-1.2.0-beta.1.tgz
dsh --profile web
```

也可下载 `.tgz` 后从下载目录安装。

```sh
dsh plugin --profile web add ./dsh-server-monitor-1.2.0-beta.1.tgz
```

要保留现有 Web profile，可用一个未占用的名称创建独立试装 profile，再把安装和启动命令中的 `web` 换成该名称。

```sh
dsh --profile monitor-beta --from-default-profile web --dump-config
```

启动后从左侧栏进入「服务器监控」。在首次使用 DSH 时，如有预览说明或登录提示，可先关掉提示再打开监控页。试装完毕后先停止该 Web profile，再卸载插件。若配过目标，随后从对应的 YAML 删除 `id: server-monitor` 条目。

```sh
dsh plugin --profile web remove dsh-server-monitor
```

## 配置文件

使用 `~/.dsh/profiles/<profile>/cordis.patch.yml`。如果设置了 `DSH_HOME`，使用对应目录。将 `- id: server-monitor` 合并到现有 YAML 列表，已有同名条目时编辑原条目。空文件模板里的 `[]` 可以替换为下面的条目。

```yaml
- id: server-monitor
  config:
    intervalMs: 3000
    connectTimeoutMs: 8000
    targets:
      - id: app-server
        label: 应用服务器
        host: server.example.com
        port: 22
        user: your-user
        keyPath: ~/.ssh/id_ed25519
```

| 字段 | 含义 |
| --- | --- |
| `targets[].id` | 每台目标独有的标识 |
| `targets[].label` | 监控页名称，可省略 |
| `targets[].host` / `user` | 直连时使用的 SSH 主机和用户 |
| `targets[].port` / `keyPath` | 默认端口为 22。可省略密钥路径，由 OpenSSH 使用 SSH agent 或它自己的身份配置 |
| `targets[].remoteSshProfile` | 同 profile 的 Remote SSH 连接名或 ID。与 `host`、`user`、`port`、`keyPath` 二选一 |
| `intervalMs` | 同一目标采样的最小间隔，默认 3000，最小 1000 毫秒 |
| `connectTimeoutMs` | SSH 建连超时，默认 8000，最小 2000 毫秒 |
| `sshPath` | DSH 所在机器上的 SSH 可执行文件，默认 `/usr/bin/ssh` |

先用终端连接目标并与管理员提供的 SSH 指纹核对。首次在终端连接非默认端口时加 `-p`。保存 YAML 后在监控页点「刷新」，再点「测试 SSH」。

## 复用 Remote SSH 连接

1. 在与监控相同的 DSH profile 安装 [Remote SSH](https://github.com/ZhangFengshun/dsh-remote-ssh/tree/v2.4.48)。Web CLI 的安装命令如下。

   ```sh
   dsh plugin --profile web add @zhangfengshun/dsh-remote-ssh@2.4.48
   ```

2. 在 DSH 的「设置 → 远程连接」保存并测试一条密钥连接，可从 `~/.ssh/config` 导入。需要跳板机时，在 Remote SSH 填写 ProxyJump。监控沿用 OpenSSH 的严格主机指纹校验。若 Remote SSH 能连但监控提示指纹未验证，请在终端核对跳板与目标的指纹。
3. 将保存的连接名填入 `remoteSshProfile`。同名时可用配置中的连接 ID。支持在同一个 `targets` 列表混用直连和引用。

   ```yaml
   - id: server-monitor
     config:
       targets:
         - id: app-server
           remoteSshProfile: My Linux server
           services:
             prometheus:
               url: http://127.0.0.1:9090/prometheus
   ```

在「服务器监控」看指标，进入 Remote SSH 的工作区使用终端和文件。变更保存的连接后，监控在下一次刷新时读取新参数。改动主机或 SSH 身份会重新开始该目标的趋势记录。监控读取 DSH 脱敏后的连接信息，支持密钥认证。

## 监控服务

在任意目标的 `services` 下只填写需要探测的服务。以下只是示例，端口和路径需与部署匹配。

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

`url` 从被监控的 Linux 主机访问，是 HTTP(S) 服务根地址，可带反向代理前缀。`link` 是可选的浏览器入口。URL 使用无需凭据的读接口，且不含密码、token 或查询参数。

| 服务 | 探测端点 |
| --- | --- |
| Grafana | `/api/health` |
| Prometheus | `/-/ready`，通过后读取 `/api/v1/targets?state=active` |
| Uptime Kuma | `/api/entry-page` |
| node_exporter | `/metrics` |

探测结果表示指定端点是否返回 HTTP 200。Prometheus 抓取状态在服务页单独显示。Kuma 的具体监控项可登录 Kuma 查看。

## 常见问题

| 现象 | 检查项 |
| --- | --- |
| 首次打开仍显示「添加服务器」 | 检查 DSH 当前使用的 profile，确认 YAML 中没有保留空列表 `[]`，再点刷新 |
| 找不到 Remote SSH 连接 | 两个插件需在同一 profile，且名称大小写一致。同名时填连接 ID |
| 指纹校验失败 | 比对管理员提供的指纹和本机 `known_hosts`，核对跳板机配置 |
| 密钥认证失败 | 核对 SSH 用户、私钥路径与文件权限，或确认运行 DSH 的进程能访问 SSH agent |
| 监控服务探测未通过 | 从被监控主机检查对应端点和代理前缀。Prometheus 的抓取 API 需要返回 JSON |
| PSI、GPU 或容器显示空值 | 检查 Linux 内核能力、相关工具和 SSH 用户权限 |
