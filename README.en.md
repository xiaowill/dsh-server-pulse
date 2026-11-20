# DSH Server Monitor

**Watch Linux servers from the DeepSeek Harness sidebar.** View CPU and memory, network and disk trends, processes, and monitoring probes across multiple hosts.

[简体中文](README.md) · [Download](https://github.com/xiaowill/dsh-server-monitor/releases/tag/v1.2.0-beta.1) · [Setup and configuration (Chinese)](docs/installation.md) · [Changelog (Chinese)](CHANGELOG.md)

![Overview dashboard with sample data from two hosts](docs/assets/dashboard.png)

## Install and connect

Tested with DSH `0.2.2-rc.5`, an OpenSSH client on the machine running DSH, and Linux targets.

```sh
dsh plugin --profile web add https://github.com/xiaowill/dsh-server-monitor/releases/download/v1.2.0-beta.1/dsh-server-monitor-1.2.0-beta.1.tgz
dsh --profile web
```

Open **Server Monitor** in the sidebar. Edit `~/.dsh/profiles/web/cordis.patch.yml` and replace the empty list `[]` with the example below, or add the entry to the existing list. Verify the server’s host key in OpenSSH, then select **Refresh** and **Test SSH**.

```yaml
- id: server-monitor
  config:
    targets:
      - id: app-server
        host: server.example.com
        user: your-user
        keyPath: ~/.ssh/id_ed25519
```

To reuse a saved key-based connection from [Remote SSH](https://github.com/ZhangFengshun/dsh-remote-ssh), install version `2.4.48` in the same DSH profile. In the target above, replace `host`, `user`, and `keyPath` with `remoteSshProfile: My Linux server`, using the saved connection name or ID. Remote SSH supplies the interactive terminal and remote workspace. Server Monitor uses the saved connection parameters to collect metrics independently over read-only SSH.

## What it monitors

- CPU, memory, swap, load, resource pressure, and recent trends
- Filesystem usage, inode usage, disk throughput, IOPS, and latency
- Network throughput, interface drops, TCP states, and retransmissions
- Process rankings with PID and process name, plus GPU and Docker when available
- Optional Grafana, Prometheus, Uptime Kuma, and node_exporter probes, with Prometheus scrape target details

The dashboard shows up to 60 samples per host. The API is available on loopback. See [configuration and troubleshooting (Chinese)](docs/installation.md) for service URLs, permissions, and example settings.

[Project architecture (Chinese)](docs/architecture.md) · [Report an issue](https://github.com/xiaowill/dsh-server-monitor/issues) · [MIT License](LICENSE)
