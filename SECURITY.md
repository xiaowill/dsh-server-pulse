# 安全政策 / Security Policy

## 概述 / Overview

dsh-server-pulse 是 DeepSeek Harness（DSH）的**只读 SSH 服务器监控插件**。本文件说明它的安全边界，以及如何私下报告漏洞。
dsh-server-pulse is a **read-only SSH server monitoring plugin** for DeepSeek Harness (DSH). This document describes its security boundaries and how to report vulnerabilities privately.

## 安全设计 / Security design

- **只读监控 / Read-only monitoring**：插件仅通过 OpenSSH 连接目标机，执行采集 CPU、内存、磁盘、网络、进程和监控服务状态的只读命令；**不修改远端文件、配置或服务**，不执行写入型操作。
  The plugin connects to targets over OpenSSH and runs read-only commands to collect CPU, memory, disk, network, process and service metrics. It **never modifies remote files, configuration or services**.

- **不存储密钥 / No key storage**：目标机的认证由本机 OpenSSH（`~/.ssh/config`、密钥文件、ssh-agent）或 DSH 的 Remote SSH profile 管理。插件只读取本机别名与连接元信息，并把目标 ID／别名保存在本地 `cordis.patch.yml`；**不读取、不复制、不保存私钥或密码**。
  Authentication is handled by the local OpenSSH setup or a DSH Remote SSH profile. The plugin reads local host aliases and connection metadata and stores target IDs/aliases in the local `cordis.patch.yml`. It **never reads, copies or stores private keys or passwords**.

- **数据范围 / Data scope**：监控数据（每台主机最近 60 次采样）仅保留在本地运行状态中；Kuma 监控项来自公开的统计页面。
  Monitoring samples (the latest 60 per host) are kept only in local runtime state; Kuma monitors come from public status pages.

- **依赖 / Dependencies**：需要 Node >= 22 与目标机上的 Linux 工具链；实际 SSH 连接由 OpenSSH 解析别名、端口和 ProxyJump。
  Requires Node >= 22 and standard Linux tooling on targets; OpenSSH resolves aliases, ports and ProxyJump.

## 报告漏洞 / Reporting a vulnerability

请**不要**在公开 Issue 中披露漏洞细节。请优先使用 GitHub 的私有安全公告提交：
Please **do not** disclose vulnerability details in a public issue. Prefer a private GitHub security advisory:

- <https://github.com/xiaowill/dsh-server-pulse/security/advisories/new>

如果无法使用上述入口，请通过 GitHub 联系仓库 owner（[@xiaowill](https://github.com/xiaowill)）。请附上：受影响版本、复现步骤、影响范围和建议的修复方式。我们会在确认后尽快回复并协调披露时间。
If that is unavailable, contact the repository owner on GitHub ([@xiaowill](https://github.com/xiaowill)). Include: affected version, reproduction steps, impact, and a suggested fix. We will respond as soon as the report is confirmed and coordinate disclosure.

## 支持的版本 / Supported versions

| 版本 / Version | 是否支持 / Supported |
| --- | --- |
| 1.3.x | ✅ 是 / Yes |
| < 1.3 | ❌ 否，请升级 / No, please upgrade |

仅对最新发布线提供安全修复，建议始终使用最新标签版本。
Security fixes are provided for the latest release line only; always use the newest tagged release.
