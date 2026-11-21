# 安装与配置

Server Pulse 是只读的 DSH 插件：Host 端通过本机 OpenSSH 连接 Linux 目标，采集资源指标并探测监控服务，Web 面板只负责展示。

## 前置条件

- DSH `0.2.2-rc.5` 及兼容版本的本机 Web profile。
- DSH 所在机器安装 OpenSSH 客户端（默认调用 `/usr/bin/ssh`，可用 `sshPath` 覆盖）。
- 被监控主机为 Linux，提供 Bash 与可读的 `/proc`；插件不要求目标安装任何 agent 或 node_exporter。
- 服务探测使用目标机自身的 `curl`，需已安装并允许访问本机回环地址。

## 安装方式

### 方式一：GitHub 直装（`github:`）

从仓库源码直接安装到指定 profile：

```sh
dsh plugin --profile web add github:xiaowill/dsh-server-pulse
dsh --profile web
```

也可使用仓库 URL：`dsh plugin --profile web add https://github.com/xiaowill/dsh-server-pulse`。若 DSH 提示源码需要构建脚本，确认后再继续。安装后从左侧栏打开「服务器监控」面板。

### 方式二：先下载 GitHub Release 的 `.tgz`，再用 DSH 安装

从 [v1.3.0 Release](https://github.com/xiaowill/dsh-server-pulse/releases/tag/v1.3.0) 下载 `dsh-server-pulse-1.3.0.tgz`，在下载目录执行：

```sh
dsh plugin --profile web add ./dsh-server-pulse-1.3.0.tgz
dsh --profile web
```

预构建包无需构建脚本，适合离线或受限环境。

### 方式三：DSH 插件市场界面

打开 DSH Web 界面 → **Plugins → Add plugin**，填入 `github:xiaowill/dsh-server-pulse`（或本地目录 / 包名）并安装。若要在 **Discover** 中发现本插件，需开启实验性的 *Custom plugin indexes* 并添加仓库来源。安装后刷新 DSH，再从左侧栏打开面板。

### 独立试装 profile（可选）

若要保留现有 Web 环境，可先创建一个未使用的试装 profile：

```sh
dsh --profile monitor --from-default-profile web --dump-config
```

然后把上面安装与启动命令中的 `web` 替换为 `monitor`。

### 卸载

停止对应 profile 后执行卸载，并删除 `cordis.patch.yml` 里对应的 `server-pulse` 条目：

```sh
dsh plugin --profile monitor remove dsh-server-pulse
```

## 配置监控目标

从左侧栏打开「服务器监控」，在「本机 SSH 主机」勾选别名。将生成的条目加入 `~/.dsh/profiles/<profile>/cordis.patch.yml`；设置了 `DSH_HOME` 时使用对应目录。已有 `server-pulse` 条目时，只合并其中的 `targets`，保留原有目标的服务配置。空文件里的 `[]` 直接替换。

```yaml
- id: server-pulse
  config:
    targets:
      # 方式一：复用本机 OpenSSH 别名（alias）
      - id: app
        label: 应用服务器
        sshHost: my-linux-server

      # 方式二：手动填写 host / user / key
      - id: db
        label: 数据库服务器
        host: 10.0.0.12
        user: ops
        port: 22
        keyPath: ~/.ssh/id_ed25519
    intervalMs: 3000
    connectTimeoutMs: 8000
    sshPath: /usr/bin/ssh
```

别名来自本机 `~/.ssh/config` 的具体 `Host` 条目，支持扫描 `Include` 文件。发现阶段只列名字，OpenSSH 在实际连接时才解释条件匹配、身份、端口与 ProxyJump。在终端核对目标指纹后，回到面板点「刷新」，再点「测试 SSH」。

`sshHost` 与手填 `host` / `user` / `keyPath` 二选一，不可在同一目标中混填。省略 `keyPath` 时，OpenSSH 使用 ssh-agent 或自身的身份配置。

| 字段 | 用途 |
| --- | --- |
| `targets[].id` | 目标唯一标识，只能含字母、数字、点、连字符或下划线 |
| `targets[].label` | 面板显示名称，可省略 |
| `targets[].sshHost` | 本机 OpenSSH Host 别名，与手填连接参数二选一 |
| `targets[].host` | 手动填写的主机名或 IP |
| `targets[].user` | 手动填写的 SSH 用户名 |
| `targets[].port` | 手动填写的 SSH 端口，默认 22 |
| `targets[].keyPath` | 手动填写的私钥路径，可省略 |
| `intervalMs` | 同一目标的最小采样间隔，默认 3000，最小 1000 毫秒 |
| `connectTimeoutMs` | SSH 建连超时，默认 8000，最小 2000 毫秒 |
| `sshPath` | OpenSSH 可执行文件，默认 `/usr/bin/ssh` |

从 `1.2.0-beta.1` 升级时，把目标里的 `remoteSshProfile` 换成 `sshHost`，值为本机 OpenSSH 的 Host 别名。只有本插件的目标配置需要迁移。

## 监控服务

由被监控的 Linux 主机访问其本机回环地址，只检查下表中的官方默认端口与固定端点。自动探测只列出识别到的服务；配置了明确 `url` 的服务则始终有对应卡片，即使当前不可达。

| 服务 | 官方默认端口 | 端点 | 可显示的服务数据 |
| --- | --- | --- | --- |
| Grafana | 3000 | `/api/health` | 版本与数据库健康状态 |
| Prometheus | 9090 | `/-/ready` | 就绪状态、版本、抓取目标状态/耗时/错误 |
| Uptime Kuma | 3001 | `/api/entry-page` | Web 可达性、公开状态页监控项、24 小时可用率与最近响应时间 |
| node_exporter | 9100 | `/metrics` | 端点可达性与探测耗时 |

自定义端口或反代根路径可写在所选目标的 `services` 下：

```yaml
- id: server-pulse
  config:
    targets:
      - id: app
        sshHost: my-linux-server
        services:
          grafana:
            url: http://127.0.0.1:3000/grafana
            link: https://grafana.example.com/grafana
          prometheus:
            url: http://127.0.0.1:9090/prometheus
          uptime-kuma:
            url: http://127.0.0.1:3001
            statusPage: infrastructure
          node-exporter:
            url: http://127.0.0.1:9100
```

`url` 是目标 Linux 主机可访问的服务根地址，`link` 是可选的浏览器入口。`statusPage` 填 Kuma 公开状态页的 slug，默认尝试 `default`。只有端点开放匿名读取时才会显示对应数据；私有监控项请在 Kuma 自己的面板查看。

## 故障排查

| 现象 | 检查项 |
| --- | --- |
| 看不到 SSH 别名 | 确认 DSH 运行在保存 OpenSSH 配置的本机，检查 `Host` 与 `Include` 条目 |
| SSH 连接超时 | 检查 `connectTimeoutMs`、网络可达性、防火墙与 ProxyJump，再用「测试 SSH」复测 |
| 权限被拒绝 | 核对 `user`、`keyPath` 与远端 `authorized_keys`；别名模式下由 OpenSSH 决定身份 |
| 指纹校验失败 | 在终端核对管理员提供的指纹、`known_hosts` 与跳板机配置 |
| 保存后未出现目标 | 检查当前 profile、`cordis.patch.yml` 的 YAML 列表格式，然后点「刷新」 |
| 监控服务未识别 | 确认服务在目标机本机端口监听，检查反代前缀与访问规则；自定义地址需填 `services` |
| Kuma 可达但没有监控项 | 核对是否发布了公开状态页以及 `statusPage` slug |
| 更改 SSH 别名指向后历史异常 | 重启 DSH；采样历史随 Host 进程存放在内存中 |

### 只读保证

采集脚本只读取 `/proc`、`/sys`、`df`、`ps`、`ss`、`systemctl --failed`、`nvidia-smi`、`docker stats`，以及通过 `curl` 访问目标机回环上的监控服务接口。它不写文件、不改配置、不安装软件；服务地址作为参数逐项加引号传递，避免命令注入。

SSH 连接使用 `BatchMode=yes`（不交互询问口令）、`StrictHostKeyChecking=yes`（严格校验主机指纹）、`ClearAllForwardings=yes`、`ForwardAgent=no` 与 `RequestTTY=no`。插件不会把私钥写入任何文件：别名模式直接复用本机 OpenSSH 配置，手填模式仅按 `keyPath` 引用已有密钥。HTTP API 只监听本机回环且只接受 GET，并校验 `Host` / `Origin` / `Sec-Fetch-Site`，拒绝非回环与跨域请求。
