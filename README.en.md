# DSH Server Pulse

[![CI](https://github.com/xiaowill/dsh-server-pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/xiaowill/dsh-server-pulse/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/xiaowill/dsh-server-pulse)](https://github.com/xiaowill/dsh-server-pulse/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

English · [简体中文](README.md)

**Read-only monitoring that leaves your servers alone.** DSH Server Pulse puts Linux server metrics straight into the DeepSeek Harness sidebar: no agent to install on the remote host, no node_exporter to deploy, and no new credentials — it reuses the OpenSSH profile and keys you already have on this machine.

[Installation and configuration (Chinese)](docs/installation.md) · [Architecture (Chinese)](docs/architecture.md) · [Changelog](CHANGELOG.md)

![Overview dashboard with CPU, memory, network and disk trends for two sample hosts](docs/assets/dashboard.png)

*The screenshot uses sample data. See all [screenshots](#screenshots) below.*

## Features

- **CPU**: total usage, iowait, system time, context switches and interrupts per second.
- **Memory and swap**: used/available memory, usage percentage and swap usage.
- **Load**: 1/5/15-minute load averages, with alert thresholds scaled by CPU core count.
- **Network and TCP**: per-interface receive/transmit rates, errors and drops; TCP state distribution, retransmits per second and retransmit percentage.
- **Disks**: mount capacity and inode usage; physical disk IOPS, throughput, latency and utilization.
- **GPU**: utilization and memory from `nvidia-smi` when available on the target.
- **Processes**: CPU/memory rankings, process state distribution and zombie count.
- **Containers and system**: Docker container resource usage and failed systemd units.
- **Monitoring service probes**: reachability plus service-level data for Grafana, Prometheus, Uptime Kuma and node_exporter.
- **Threshold alerts**: active alerts sorted by severity, covering CPU, iowait, memory, swap, disk, inode, load, retransmits, zombies and GPU.

Every collection command is read-only. Each host keeps its last 60 samples in memory; on disconnect the last successful sample is retained and its time is shown.

## Installation

### 1. Direct install from GitHub (`github:`)

Run on the machine hosting DSH to install the repository source into a profile:

```sh
dsh plugin --profile web add github:xiaowill/dsh-server-pulse
dsh --profile web
```

You can also use the repository URL: `dsh plugin --profile web add https://github.com/xiaowill/dsh-server-pulse`. If a source install triggers build scripts, approve them when DSH asks.

### 2. Download the `.tgz` from GitHub Releases and install with DSH

Download `dsh-server-pulse-1.3.0.tgz` from the [v1.3.0 release](https://github.com/xiaowill/dsh-server-pulse/releases/tag/v1.3.0), then run this from the download directory:

```sh
dsh plugin --profile web add ./dsh-server-pulse-1.3.0.tgz
dsh --profile web
```

The prebuilt package needs no build scripts, which suits offline or restricted environments.

### 3. DSH plugin manager UI

In the DSH Web UI, open **Plugins → Add plugin** and enter `github:xiaowill/dsh-server-pulse` (or a local directory / package name). To surface the plugin in **Discover**, enable the experimental *Custom plugin indexes* and add the repository source. After installing, refresh DSH and open the **Server Monitor** panel in the sidebar.

> For full parameters, a separate trial profile and uninstall steps, see [Installation and configuration (Chinese)](docs/installation.md).

## Custom configuration

The panel reads `Host` aliases from your local `~/.ssh/config` (including `Include` files). After selecting targets, merge the generated entry into the active profile's `cordis.patch.yml`; replace the `[]` in an empty file directly.

The example below shows both target forms: an SSH alias (alias) and manually supplied host / user / key.

```yaml
- id: server-pulse
  config:
    targets:
      # Form 1: reuse a local OpenSSH alias; OpenSSH resolves keys, port and ProxyJump
      - id: app
        label: App server
        sshHost: my-linux-server

      # Form 2: supply connection parameters manually (host / user / key)
      - id: db
        label: Database server
        host: 10.0.0.12
        user: ops
        port: 22
        keyPath: ~/.ssh/id_ed25519
    intervalMs: 3000
    connectTimeoutMs: 8000
```

Only hosts listed in `targets` are collected. While browsing aliases the plugin only reads names from the local config — it opens no SSH connection and never reads key material. Use either `sshHost` or the manual `host` / `user` / `keyPath` fields, never both on one target.

## Screenshots

<details>
<summary>Expand to see all screenshots</summary>

**Overview**

![Server monitoring overview](docs/assets/dashboard.png)

**Monitoring services**

![Grafana, Prometheus, Uptime Kuma and node_exporter probe details](docs/assets/services.png)

**First run: select an SSH host**

![Local SSH alias selection](docs/assets/first-run.png)

</details>

## Alert thresholds

| Metric | Warning | Critical |
| --- | --- | --- |
| CPU usage | ≥ 85% | ≥ 95% |
| Disk I/O wait (iowait) | ≥ 20% | ≥ 50% |
| Memory usage | ≥ 85% | ≥ 95% |
| Swap usage | ≥ 80% | ≥ 95% |
| Disk usage | ≥ 80% | ≥ 90% |
| inode usage | ≥ 85% | ≥ 95% |
| Load (1-minute / CPU cores) | ≥ 1× | ≥ 2× |
| TCP retransmit rate | ≥ 5% | — |
| Zombie processes | ≥ 20 | — |
| Failed systemd units | ≥ 1 | — |
| GPU utilization | ≥ 85% | ≥ 95% |

## FAQ

| Symptom | What to check |
| --- | --- |
| No SSH aliases shown | Confirm DSH runs on the machine holding the OpenSSH config; check `Host` and `Include` entries |
| No targets after saving | Check the active profile and the YAML list format of `cordis.patch.yml`, then click Refresh |
| Host key verification fails | Verify the fingerprint from your administrator, `known_hosts` and any jump host settings in a terminal |
| SSH connection times out | Check `connectTimeoutMs`, network reachability and ProxyJump; use Test SSH to locate the cause |
| Permission denied | Check `user`, `keyPath` and the remote `authorized_keys`; in alias mode OpenSSH chooses the identity |
| Monitoring services not detected | Services must listen on the target's local ports; check proxy prefixes and anonymous read access, or set `services` |
| Kuma reachable but no monitors | Confirm a public status page is published and the `statusPage` slug is correct |
| History looks wrong after changing an alias | Restart DSH; sample history lives in the Host process memory |

## Development

```sh
npm run check
npm test
mkdir -p dist
npm pack --pack-destination dist
```

[Architecture (Chinese)](docs/architecture.md) · [Installation (Chinese)](docs/installation.md) · [Report an issue](https://github.com/xiaowill/dsh-server-pulse/issues) · [MIT License](LICENSE)
