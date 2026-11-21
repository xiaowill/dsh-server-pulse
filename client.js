window.__ModuleLoader__.load({
  id: "dsh-server-pulse",
  factory(require) {
    const React = require("react");
    const h = React.createElement;
    const { useState, useEffect } = React;

    const NS = "server-pulse";
    const API = "api/server-pulse";
    const PANEL_ID = "server-pulse";
    const PANEL_ORDER = 40;
    const POLL_MS = 3000;
    const OFFLINE_MS = 15000;

    //#region dictionaries
    const zh = {
      "setup.hosts": "本机 SSH 主机",
      "setup.aliasTip": "从本机 OpenSSH 配置选主机。将生成的目标加入当前 DSH profile 的 cordis.patch.yml。已有配置时合并 targets。若文件只有 []，用生成的内容替换它。",
      "setup.monitored": "已监控",
      "setup.noAliases": "没有找到可列出的 Host 别名。也可以手动填入你已用 OpenSSH 验证过的名称。",
      "setup.yaml": "监控配置 YAML",
      "setup.loadingAliases": "正在读取本机 SSH 配置…",
      "label.version": "版本",
      "label.database": "数据库",
      "label.kumaMonitors": "Kuma 公开监控项",
      "label.kumaMonitor": "监控项",
      "label.kumaUptime": "24 小时可用率",
      "label.kumaPing": "最近响应",
      "label.pending": "等待检测",
      "label.maintenance": "维护中",
      "hint.kumaEmpty": "这个公开状态页还没有监控项。",
      "setup.trust": "先在终端用 SSH 连接一次并核对主机指纹。保存配置后点「刷新」，再点「测试 SSH」。",
      "setup.services": "未在常见端口发现监控服务。也可以在这台主机的 services 下配置自定义地址。",
      "action.sshTest": "测试 SSH",
      "action.sshTesting": "正在测试 SSH…",
      "ssh.success": "SSH 和 Linux 采集环境检查通过（{ms} ms）",
      "ssh.host-key": "SSH 主机指纹无法验证。请在终端核对指纹和 known_hosts。",
      "ssh.auth": "SSH 认证失败。请核对用户、私钥路径和密钥权限。",
      "ssh.network": "无法建立 SSH 连接。请核对主机、端口和网络或 VPN。",
      "ssh.linux": "SSH 已连接，但目标没有 Linux 采集所需的 /proc 文件。",
      "ssh.other": "SSH 检查失败，请查看详细信息。",
      "nav.overview": "总览",
      "nav.compute": "计算与进程",
      "nav.storage": "存储",
      "label.sshOnline": "SSH 采集在线",
      "label.promDown": "{n} 个抓取目标异常",
      "label.history": "资源趋势",
      "label.pressure": "资源等待（PSI）",
      "hint.pressure": "过去 10 秒内，至少一项任务因资源不足等待的时间比例。",
      "label.live": "自动刷新",
      "label.paused": "刷新已暂停",
      "label.sample": "数据采样",
      "label.lastAttempt": "最近尝试",
      "label.serviceUp": "探测通过",
      "label.serviceDown": "探测未通过",
      "label.historyUnknown": "未采样",
      "label.status": "状态",
      "label.scrape": "最近抓取",
      "label.duration": "耗时",
      "label.unknown": "未知",
      "hint.promUnavailable": "当前无法读取 Prometheus 目标列表。",
      "hint.promEmpty": "Prometheus 当前没有活跃抓取目标。",
      "hint.kuma": "Kuma Web 服务可达。开放状态页后，可在 uptime-kuma 的 statusPage 配置中指定 slug 来显示公开监控项。",
      "label.readLatency": "读延迟",
      "label.writeLatency": "写延迟",
      "label.inFlight": "进行中",
      "label.drops": "丢包/秒",
      "label.rootDisk": "根分区",
      "label.rootFree": "剩余 {v}",
      "label.samples": "{n} 次采样",
      "hint.chartWaiting": "等待下一次采样以绘制趋势",
      "label.lastSamples": "最近探测",
      "label.mounts": "{n} 个挂载点",
      "entry.label": "服务器监控",
      "panel.title": "服务器监控",
      "panel.subtitle": "Linux 主机资源与监控服务",
      "status.online": "在线",
      "status.offline": "离线",
      "status.connecting": "连接中…",
      "status.stale": "缓存",
      "action.refresh": "刷新",
      "action.pause": "暂停",
      "action.resume": "继续",
      "label.latency": "采样耗时",
      "label.host": "主机信息",
      "label.os": "系统",
      "label.kernel": "内核",
      "label.uptime": "运行时长",
      "label.users": "登录用户",
      "label.cpu": "CPU",
      "label.memory": "内存",
      "label.swap": "交换分区",
      "label.load": "负载均值",
      "label.disks": "磁盘使用",
      "label.diskio": "磁盘 I/O",
      "label.network": "网络流量",
      "label.tcp": "TCP 连接",
      "label.processes": "进程",
      "label.gpu": "GPU",
      "label.docker": "容器",
      "label.services": "监控服务",
      "label.cores": "核心",
      "label.used": "已用",
      "label.total": "总计",
      "label.avail": "可用",
      "label.rx": "接收",
      "label.tx": "发送",
      "label.read": "读",
      "label.write": "写",
      "label.mount": "挂载点",
      "label.inode": "inode",
      "label.iowait": "I/O 等待",
      "label.system": "内核态",
      "label.context": "上下文切换",
      "label.interrupts": "中断",
      "label.retrans": "重传率",
      "label.established": "已建立",
      "label.running": "运行中",
      "label.sleeping": "休眠",
      "label.blocked": "阻塞",
      "label.zombie": "僵尸",
      "label.failed": "失败的系统服务",
      "label.promTargets": "Prometheus 抓取目标",
      "label.up": "正常",
      "label.down": "异常",
      "label.memUse": "显存占用",
      "label.util": "利用率",
      "label.cpuTop": "CPU 占用最高",
      "label.memTop": "内存占用最高",
      "label.command": "进程名",
      "label.interface": "网卡",
      "label.device": "设备",
      "label.probe": "探测从被监控的 Linux 主机发起。外部面板链接从你的浏览器打开。",
      "empty.loading": "正在连接主机并采集指标…",
      "empty.offline": "无法连接到主机",
      "empty.noData": "暂无数据",
      "hint.offline": "请确认 VPN/网络可达、SSH 密钥有效且该用户可登录。",
      "hint.stale": "以下为最近一次成功采样的数据（已过期）。",
      "error.title": "采集失败",
      "no.gpu": "未检测到 NVIDIA GPU",
      "no.docker": "无可用容器数据（该用户可能没有 docker 权限）",
      "no.disk": "没有可见的磁盘",
      "no.network": "没有可见的物理网卡",
      "no.failed": "无失败服务",
      "alert.cpu": "CPU 使用率 {v}%",
      "alert.iowait": "磁盘 I/O 等待 {v}%（磁盘可能过载）",
      "alert.mem": "内存使用率 {v}%",
      "alert.swap": "交换分区使用率 {v}%",
      "alert.disk": "磁盘 {m} 使用率 {v}%",
      "alert.inode": "挂载点 {m} inode 使用率 {v}%",
      "alert.load": "负载 {v} 超过核心数 {n} 倍",
      "alert.retrans": "TCP 重传率 {v}%",
      "alert.zombie": "僵尸进程 {v} 个",
      "alert.failed": "{v} 个 systemd 服务失败",
      "alert.gpu": "GPU {i} 利用率 {v}%",
      "alert.count": "{n} 项告警",
      "sev.crit": "严重",
      "sev.warn": "警告",
      "health.svcUp": "{n} 项探测通过",
      "label.health": "整体状态",
      "setup.copyYaml": "复制 YAML",
      "setup.copied": "已复制",
      "setup.copyFailed": "复制失败，请手动选择文本复制",
      "label.refreshEvery": "刷新间隔",
      "label.jobInstance": "任务 / 实例",
      "label.name": "名称",
    };
    const en = {
      "setup.hosts": "Local SSH hosts",
      "setup.aliasTip": "Select hosts from your local OpenSSH config and merge the generated targets into the current DSH profile’s cordis.patch.yml. Replace [] if the file contains an empty list.",
      "setup.monitored": "Monitored",
      "setup.noAliases": "No literal Host aliases were found. You can also enter a name you have already verified with OpenSSH.",
      "setup.yaml": "Monitoring configuration YAML",
      "setup.loadingAliases": "Reading local SSH config…",
      "label.version": "Version",
      "label.database": "Database",
      "label.kumaMonitors": "Kuma public monitors",
      "label.kumaMonitor": "Monitor",
      "label.kumaUptime": "24h uptime",
      "label.kumaPing": "Last response",
      "label.pending": "Pending",
      "label.maintenance": "Maintenance",
      "hint.kumaEmpty": "This public status page has no monitors.",
      "setup.trust": "Connect once in a terminal and verify the SSH host fingerprint. Save the configuration, refresh, then select Test SSH.",
      "setup.services": "No monitoring services were found on the common ports. Add custom URLs under this host’s services mapping.",
      "action.sshTest": "Test SSH",
      "action.sshTesting": "Testing SSH…",
      "ssh.success": "SSH and Linux environment checks passed ({ms} ms)",
      "ssh.host-key": "SSH host key verification failed. Verify the fingerprint and known_hosts in your terminal.",
      "ssh.auth": "SSH authentication failed. Check the user, identity path, and key permissions.",
      "ssh.network": "The SSH connection could not be established. Check the host, port, network, or VPN.",
      "ssh.linux": "SSH connected, but the target lacks the /proc files required for Linux monitoring.",
      "ssh.other": "SSH check failed. See the details below.",
      "nav.overview": "Overview",
      "nav.compute": "Compute",
      "nav.storage": "Storage",
      "label.sshOnline": "SSH online",
      "label.promDown": "{n} scrape targets down",
      "label.history": "Resource trends",
      "label.pressure": "Resource pressure (PSI)",
      "hint.pressure": "Share of the last 10 seconds when at least one task stalled on a resource.",
      "label.live": "Auto-refresh",
      "label.paused": "Refresh paused",
      "label.sample": "Sampled",
      "label.lastAttempt": "Last attempt",
      "label.serviceUp": "Probe passed",
      "label.serviceDown": "Probe failed",
      "label.historyUnknown": "Not sampled",
      "label.status": "Status",
      "label.scrape": "Last scrape",
      "label.duration": "Duration",
      "label.unknown": "Unknown",
      "hint.promUnavailable": "Prometheus target data is unavailable.",
      "hint.promEmpty": "Prometheus has no active scrape targets.",
      "hint.kuma": "Kuma is reachable. Configure the statusPage slug of a public page to show its monitors.",
      "label.readLatency": "Read latency",
      "label.writeLatency": "Write latency",
      "label.inFlight": "In flight",
      "label.drops": "Drops/s",
      "label.rootDisk": "Root filesystem",
      "label.rootFree": "{v} free",
      "label.samples": "{n} samples",
      "hint.chartWaiting": "Waiting for another sample to plot a trend",
      "label.lastSamples": "Recent probes",
      "label.mounts": "{n} mounts",
      "entry.label": "Server Monitor",
      "panel.title": "Server Monitor",
      "panel.subtitle": "Linux resources and monitoring services",
      "status.online": "Online",
      "status.offline": "Offline",
      "status.connecting": "Connecting…",
      "status.stale": "Cached",
      "action.refresh": "Refresh",
      "action.pause": "Pause",
      "action.resume": "Resume",
      "label.latency": "Sample time",
      "label.host": "Host",
      "label.os": "OS",
      "label.kernel": "Kernel",
      "label.uptime": "Uptime",
      "label.users": "Users",
      "label.cpu": "CPU",
      "label.memory": "Memory",
      "label.swap": "Swap",
      "label.load": "Load average",
      "label.disks": "Disk usage",
      "label.diskio": "Disk I/O",
      "label.network": "Network",
      "label.tcp": "TCP connections",
      "label.processes": "Processes",
      "label.gpu": "GPU",
      "label.docker": "Containers",
      "label.services": "Monitoring services",
      "label.cores": "Cores",
      "label.used": "Used",
      "label.total": "Total",
      "label.avail": "Available",
      "label.rx": "RX",
      "label.tx": "TX",
      "label.read": "Read",
      "label.write": "Write",
      "label.mount": "Mount",
      "label.inode": "inode",
      "label.iowait": "I/O wait",
      "label.system": "System",
      "label.context": "Context switches",
      "label.interrupts": "Interrupts",
      "label.retrans": "Retransmits",
      "label.established": "Established",
      "label.running": "Running",
      "label.sleeping": "Sleeping",
      "label.blocked": "Blocked",
      "label.zombie": "Zombie",
      "label.failed": "Failed systemd units",
      "label.promTargets": "Prometheus scrape targets",
      "label.up": "Up",
      "label.down": "Down",
      "label.memUse": "Memory",
      "label.util": "Utilization",
      "label.cpuTop": "Top by CPU",
      "label.memTop": "Top by memory",
      "label.command": "Process",
      "label.interface": "Interface",
      "label.device": "Device",
      "label.probe": "Probes run on the monitored Linux host. Dashboard links open in your browser.",
      "empty.loading": "Connecting and sampling metrics…",
      "empty.offline": "Cannot connect to host",
      "empty.noData": "No data yet",
      "hint.offline": "Check VPN/network, SSH key, and that this user can log in.",
      "hint.stale": "Showing the last successful sample (stale).",
      "error.title": "Collection failed",
      "no.gpu": "No NVIDIA GPU detected",
      "no.docker": "No container data (user may lack docker access)",
      "no.disk": "No visible disks",
      "no.network": "No visible network interfaces",
      "no.failed": "No failed services",
      "alert.cpu": "CPU usage {v}%",
      "alert.iowait": "Disk I/O wait {v}% (disk may be overloaded)",
      "alert.mem": "Memory usage {v}%",
      "alert.swap": "Swap usage {v}%",
      "alert.disk": "Disk {m} usage {v}%",
      "alert.inode": "Mount {m} inode usage {v}%",
      "alert.load": "Load {v} exceeds {n}× core count",
      "alert.retrans": "TCP retransmit rate {v}%",
      "alert.zombie": "{v} zombie processes",
      "alert.failed": "{v} systemd units failed",
      "alert.gpu": "GPU {i} utilization {v}%",
      "alert.count": "{n} alert(s)",
      "sev.crit": "Critical",
      "sev.warn": "Warning",
      "health.svcUp": "{n} probes passed",
      "label.health": "Overall health",
      "setup.copyYaml": "Copy YAML",
      "setup.copied": "Copied",
      "setup.copyFailed": "Copy failed — please select and copy manually",
      "label.refreshEvery": "Refresh",
      "label.jobInstance": "Job / Instance",
      "label.name": "Name",
    };
    const dictionaries = { zh, en };
    let translate = null;
    function tt(key, params) {
      let text;
      try { if (typeof translate === "function") text = translate(key); } catch { text = undefined; }
      if (text === undefined || text === null || text === "") text = zh[key] || en[key] || key;
      if (params) for (const k of Object.keys(params)) text = text.replace(new RegExp("\\{" + k + "\\}", "g"), String(params[k]));
      return text;
    }
    //#endregion

    //#region formatting
    function fmtBytes(bytes) {
      if (!Number.isFinite(bytes)) return "—";
      const b = Math.max(0, bytes);
      if (b >= 1099511627776) return (b / 1099511627776).toFixed(1) + " TB";
      if (b >= 1073741824) return (b / 1073741824).toFixed(1) + " GB";
      if (b >= 1048576) return (b / 1048576).toFixed(1) + " MB";
      if (b >= 1024) return (b / 1024).toFixed(1) + " KB";
      return Math.round(b) + " B";
    }
    function fmtRate(bps) { return fmtBytes(bps) + "/s"; }
    function fmtPct(p) { return Number.isFinite(p) ? p.toFixed(1) + "%" : "—"; }
    function fmtNum(n, digits) {
      if (!Number.isFinite(n)) return "—";
      return n >= 1000 ? Math.round(n).toLocaleString("en-US") : n.toFixed(digits === undefined ? 1 : digits);
    }
    function fmtUptime(sec) {
      if (!Number.isFinite(sec) || sec <= 0) return "—";
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
    }
    function fmtClock(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour12: false });
    }
    function levelColor(pct) {
      if (!Number.isFinite(pct)) return "var(--dsw-alias-state-idle-primary)";
      if (pct >= 90) return "var(--dsw-alias-state-error-primary)";
      if (pct >= 75) return "var(--dsw-alias-state-warn-primary)";
      return "var(--dsw-alias-brand-primary)";
    }
    function metricColor(pct, base, warn, critical) {
      if (!Number.isFinite(pct)) return base;
      if (pct >= critical) return "var(--dsw-alias-state-error-primary)";
      if (pct >= warn) return "var(--dsw-alias-state-warn-primary)";
      return base;
    }
    const SERVICE_LABEL = { grafana: "Grafana", prometheus: "Prometheus", "uptime-kuma": "Uptime Kuma", "node-exporter": "node_exporter" };
    //#endregion

    //#region styles
    const CSS = `
.smx-page{--smx-radius:12px;--smx-gap:14px;--acc-blue:#3b82f6;--acc-cyan:#06b6d4;--acc-green:#10b981;--acc-amber:#f59e0b;--acc-red:#ef4444;--acc-purple:#8b5cf6;--acc-pink:#ec4899;box-sizing:border-box;height:100%;min-height:0;max-height:100%;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-gutter:stable;padding:24px clamp(14px,3vw,36px) 44px;container-type:inline-size;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,system-ui,sans-serif);font-size:14px;line-height:1.5}
.smx-page::-webkit-scrollbar{width:10px;height:10px}
.smx-page::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:99px;border:3px solid var(--dsw-alias-bg-base)}
.smx-page::-webkit-scrollbar-track{background:transparent}
.smx-page *{box-sizing:border-box}
.smx-page h1,.smx-page h2,.smx-page h3{margin:0;font-weight:650;letter-spacing:-.01em}
.smx-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.smx-title{font-size:30px;font-weight:700;line-height:1.2}
.smx-sub{font-size:12px;color:var(--dsw-alias-label-secondary)}
.smx-spacer{flex:1;min-width:8px}
.smx-btn{min-height:34px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:5px 12px;font:inherit;font-size:13px;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease}
.smx-btn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-brand-primary)}.smx-btn:active{transform:translateY(1px)}
.smx-btn-sm{min-height:26px;padding:3px 9px;font-size:12px;border-radius:7px}
.smx-refresh{display:inline-flex;align-items:center;gap:6px;font-size:12px}
.smx-select{min-height:34px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:5px 8px;font:inherit;font-size:13px;cursor:pointer}
.smx-refresh .smx-muted{white-space:nowrap}
.smx-btn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-brand-primary)}
.smx-btn:active{transform:scale(.97)}
.smx-pill{display:inline-flex;align-items:center;gap:7px;min-height:28px;padding:3px 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:12px;font-weight:600;white-space:nowrap}
.smx-dot{width:7px;height:7px;border-radius:50%;flex:none}
.smx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,155px),1fr));gap:var(--smx-gap);margin-bottom:var(--smx-gap)}
.smx-grid.two{grid-template-columns:repeat(auto-fit,minmax(min(100%,375px),1fr))}
.smx-card{position:relative;min-width:0;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--smx-radius);background:var(--dsw-alias-bg-layer-1);padding:16px 18px}
.smx-grid>.wide{grid-column:1/-1}
.smx-kpi{background:linear-gradient(180deg,color-mix(in srgb,var(--kpi-c,var(--dsw-alias-brand-primary)) 7%,var(--dsw-alias-bg-layer-1)),var(--dsw-alias-bg-layer-1) 70%)}
.smx-kpi .smx-cardTitle:before{content:"";width:7px;height:7px;border-radius:2px;background:var(--kpi-c,var(--dsw-alias-brand-primary));flex:none}
.smx-cardTitle{font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.smx-big{font-family:var(--ds-font-family-code,var(--dsw-font-family,monospace));font-size:32px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.03em}
.smx-big.sm{font-size:22px}
.smx-muted{color:var(--dsw-alias-label-secondary);font-size:12px}
.smx-mono{font-family:var(--ds-font-family-code,monospace);font-size:12px;word-break:break-all}
.smx-num{text-align:right;font-family:var(--ds-font-family-code,monospace);font-variant-numeric:tabular-nums;white-space:nowrap}
.smx-bar{height:6px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin-top:10px}
.smx-bar>i{display:block;height:100%;border-radius:99px;transition:width .3s ease}
.smx-kv{display:grid;gap:7px}
.smx-kvrow{display:flex;justify-content:space-between;gap:16px;border-bottom:1px dashed var(--dsw-alias-border-l1);padding-bottom:6px}
.smx-kvrow>span:last-child{text-align:right;font-family:var(--ds-font-family-code,monospace);font-size:12px}
.smx-table{width:100%;border-collapse:collapse;font-size:13px}
.smx-table th{text-align:left;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);padding:4px 8px 8px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.smx-table th.smx-num{text-align:right}.smx-table td{padding:8px 8px 8px 0;border-bottom:1px solid var(--dsw-alias-border-l1);vertical-align:middle}
.smx-table tr:last-child td{border-bottom:none}
.smx-table tbody tr:hover{background:var(--dsw-alias-bg-layer-2)}
.smx-metric{position:relative;z-index:1}
.smx-metricFoot{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.smx-banner{display:flex;gap:8px;align-items:flex-start;border-radius:10px;padding:10px 14px;margin-bottom:var(--smx-gap);font-size:13px;border:1px solid;border-left-width:3px}
.smx-banner[data-kind=error]{border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);color:var(--dsw-alias-label-primary)}
.smx-banner[data-kind=warn]{border-color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 10%,transparent);color:var(--dsw-alias-label-primary)}
.smx-alertList{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.smx-alertList li{padding:2px 9px;border-radius:99px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:12px}
/* top health strip — "一眼看健康" (Grafana Stat / Uptime Kuma status page) */
.smx-health{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,225px),1fr));gap:10px;margin-bottom:var(--smx-gap)}
.smx-healthHost{display:flex;align-items:center;gap:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:12px 14px;background:var(--dsw-alias-bg-layer-1);cursor:pointer;transition:border-color .15s ease,transform .15s ease}
.smx-healthHost:hover{border-color:var(--dsw-alias-border-l2);transform:translateY(-1px)}
.smx-healthHost[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.smx-healthLed{width:12px;height:12px;border-radius:50%;flex:none}
.smx-healthLed[data-s=online]{background:var(--dsw-alias-state-success-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent)}
.smx-healthLed[data-s=offline]{background:var(--dsw-alias-state-error-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--dsw-alias-state-error-primary) 16%,transparent)}
.smx-healthLed[data-s=connecting]{background:var(--dsw-alias-state-idle-primary)}
.smx-healthMeta{min-width:0;flex:1}
.smx-healthName{font-weight:650;font-size:13px;overflow-wrap:anywhere}
.smx-healthSub{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:2px}
.smx-sev{display:inline-flex;align-items:center;gap:5px;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:650;border:1px solid}
.smx-sev[data-level=crit]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.smx-sev[data-level=warn]{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent)}
.smx-services{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr));gap:10px}
.smx-serviceName{font-weight:600;font-size:13px}
.smx-servicePort{overflow-wrap:anywhere;font-family:var(--ds-font-family-code,monospace);font-size:11px;color:var(--dsw-alias-label-secondary)}
.smx-sectionTitle{font-size:13px;font-weight:650;text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);margin:20px 0 10px;display:flex;align-items:center;gap:8px}
.smx-sectionTitle:before{content:"";width:3px;height:14px;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.smx-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:260px;color:var(--dsw-alias-label-secondary);text-align:center}
.smx-spin{width:26px;height:26px;border-radius:50%;border:3px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);animation:smx-spin .8s linear infinite}
@keyframes smx-spin{to{transform:rotate(360deg)}}
.smx-skel{height:12px;border-radius:6px;background:linear-gradient(90deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-1));background-size:200% 100%;animation:smx-shimmer 1.4s ease infinite}
@keyframes smx-shimmer{to{background-position:-200% 0}}
.smx-tabs{display:flex;gap:6px}
.smx-tab{border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:8px;padding:3px 10px;font:inherit;font-size:12px;cursor:pointer}
.smx-tab[aria-pressed=true]{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.smx-shell{max-width:1440px;margin-inline:auto}
.smx-hero{display:grid;gap:14px;padding:20px 22px;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;margin-bottom:16px;background:linear-gradient(118deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,var(--dsw-alias-bg-layer-1)),var(--dsw-alias-bg-layer-1) 62%)}
.smx-hero .smx-head{margin:0}
.smx-brand,.smx-actions,.smx-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.smx-brand{gap:12px}
.smx-logo{display:grid;place-items:center;width:44px;height:44px;border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-brand-primary)}
.smx-meta{border-top:1px solid var(--dsw-alias-border-l1);padding-top:12px;column-gap:18px;font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.smx-meta strong{color:var(--dsw-alias-label-primary)}
.smx-healthHost{color:inherit;font:inherit;text-align:left;min-width:0;overflow-wrap:anywhere}
.smx-healthHost[aria-pressed=true]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,var(--dsw-alias-bg-layer-1))}
.smx-probeWarning{color:var(--dsw-alias-state-warn-primary)}
.smx-healthInfo{display:grid;gap:2px;text-align:right;font-size:12px;color:var(--dsw-alias-label-secondary)}
.smx-nav{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:18px}
.smx-nav button{background:none;border:0;border-bottom:2px solid transparent;padding:10px 14px;color:var(--dsw-alias-label-secondary);font:inherit;font-weight:550;cursor:pointer}
.smx-nav button:hover{background:var(--dsw-alias-bg-layer-1)}
.smx-nav button[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.smx-page :is(button,a,[tabindex]):focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.smx-page h2.smx-sectionTitle{font-size:15px;color:var(--dsw-alias-label-primary);letter-spacing:0;text-transform:none;margin:18px 0 10px}
.smx-kpi .smx-cardTitle{justify-content:flex-start;letter-spacing:0;text-transform:none}
.smx-kpi .smx-big{color:var(--dsw-alias-label-primary);font-size:clamp(21px,2.4vw,30px);overflow-wrap:anywhere}
.smx-chartGrid{grid-template-columns:repeat(2,minmax(0,1fr))}
.smx-chartBody{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px}
.smx-chartAxis{display:flex;flex-direction:column;justify-content:space-between;text-align:right;padding-block:0 20px}
.smx-plot{width:100%;height:104px;display:block;border-radius:4px}
.smx-chartTimes{display:flex;justify-content:space-between;gap:8px;font-variant-numeric:tabular-nums;min-height:20px}
.smx-chartLegend{display:flex;gap:8px 14px;flex-wrap:wrap;margin-top:8px}
.smx-seriesLegend{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.smx-seriesLegend strong{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.smx-setup{max-width:700px}.smx-setup p{margin:8px 0 12px}.smx-yamlHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 6px}.smx-setup textarea,.smx-diagnostic pre{overflow:auto;border-radius:8px;padding:12px;background:var(--dsw-alias-bg-layer-2);font:12px/1.6 var(--ds-font-family-code,monospace)}
.smx-setup textarea{box-sizing:border-box;width:100%;min-height:132px;resize:vertical;color:inherit;border:1px solid var(--dsw-alias-border-l1)}
.smx-aliases{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.smx-aliases label{display:flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:5px 8px}
.smx-diagnostic{margin-bottom:var(--smx-gap)}.smx-diagnostic pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0 0}
.smx-plotEmpty{min-height:104px;display:grid;place-items:center;text-align:center;background:var(--dsw-alias-bg-layer-2);border-radius:6px}
.smx-scroll{overflow-x:auto}
.smx-table .smx-wrap{overflow-wrap:anywhere;word-break:normal;min-width:11ch}
.smx-table .smx-scrapeError{display:block;margin-top:4px;max-width:64ch}
.smx-service{display:grid;gap:10px;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);min-width:0}
.smx-serviceHead{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}
.smx-serviceHead a{color:inherit;text-decoration:none}
.smx-serviceHead a:hover{text-decoration:underline}
.smx-serviceStatus{display:inline-flex;gap:6px;align-items:center;white-space:nowrap;font-size:12px;font-weight:550}
.smx-serviceStatus[data-s=up]{color:var(--dsw-alias-state-success-primary)}
.smx-serviceStatus[data-s=down]{color:var(--dsw-alias-state-error-primary)}
.smx-beats{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:3px;min-height:15px}
.smx-beat{height:15px;border-radius:3px;background:var(--dsw-alias-border-l2);border:1px dashed var(--dsw-alias-label-secondary)}
.smx-beat[data-s=up]{background:var(--dsw-alias-state-success-primary);border:0}
.smx-beat[data-s=down]{background:var(--dsw-alias-state-error-primary);border:0;height:8px;align-self:end}
.smx-pressure{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,125px),1fr));gap:10px;margin:10px 0 0}
.smx-pressure>div{padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.smx-pressure dt{font-size:12px;color:var(--dsw-alias-label-secondary)}
.smx-pressure dd{margin:0;font-size:21px;font-weight:650;font-variant-numeric:tabular-nums}
@container (max-width:660px){.smx-chartGrid{grid-template-columns:1fr}.smx-nav button{padding-inline:10px}}
@media (prefers-reduced-motion:reduce){.smx-page *{animation:none!important;transition:none!important}}
@media (max-width:640px){.smx-page{padding:16px 14px 32px}.smx-title{font-size:19px}.smx-big{font-size:28px}}
@container (max-width:400px){.smx-nav{gap:2px}.smx-nav button{padding-inline:7px}}
`;
    function StyleTag() { return h("style", { "data-dsh-server-pulse": "" }, CSS); }

    // Deterministic 270-degree gauge arc (segmented by thresholds) — pure SVG, no deps.
    //#endregion

    //#region components
    function Bar({ pct, color, label }) {
      const c = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
      return h("div", { className: "smx-bar", role: "meter", "aria-label": label, "aria-valuenow": Math.round(c), "aria-valuemin": 0, "aria-valuemax": 100 },
        h("i", { style: { width: c + "%", background: color || levelColor(pct) } }));
    }
    function Card({ title, wide, right, children, kpi, color }) {
      const cls = "smx-card" + (wide ? " wide" : "") + (kpi ? " smx-kpi" : "");
      const style = kpi && color ? { "--kpi-c": color } : undefined;
      return h("section", { className: cls, style },
        title || right ? h("div", { className: "smx-cardTitle" }, title ? h("span", null, title) : null, right) : null, children);
    }
    function KV({ label, value }) {
      return h("div", { className: "smx-kvrow" }, h("span", null, label), h("span", null, value));
    }
    function MetricCard({ title, value, unit, sub, pct, color, foot }) {
      const accent = color || "var(--dsw-alias-brand-primary)";
      return h(Card, { title, kpi: true, color: accent },
        h("div", { className: "smx-metric" },
          h("div", { style: { display: "flex", alignItems: "baseline", gap: 6 } },
            h("span", { className: "smx-big" }, value),
            unit ? h("span", { className: "smx-muted" }, unit) : null),
          sub ? h("div", { className: "smx-muted", style: { marginTop: 2 } }, sub) : null,
          Number.isFinite(pct) ? h(Bar, { pct, color: accent, label: title }) : null,
          foot ? h("div", { className: "smx-metricFoot" }, foot) : null));
    }

    function TrendChart({ title, history, series, unit }) {
      const [cursor, setCursor] = useState(null);
      const lastIndex = history.length - 1;
      const start = history[0]?.[0];
      const end = history[lastIndex]?.[0];
      const scale = unit === "percent" ? 100 : Math.max(1, ...history.flatMap((row) => series.map(({ index }) => row[index]).filter(Number.isFinite)));
      const format = unit === "percent" ? fmtPct : unit === "rate" ? fmtRate : fmtNum;
      const position = (row) => (row[0] - start) / (end - start) * 100;
      const selected = history[cursor ?? lastIndex];
      return h(Card, { title },
        end > start && history.some((row) => series.some(({ index }) => Number.isFinite(row[index])))
          ? h("div", { className: "smx-chartBody" },
              h("div", { className: "smx-chartAxis smx-muted", "aria-hidden": "true" },
                h("span", null, format(scale)), h("span", null, format(scale / 2)), h("span", null, format(0))),
              h("div", null,
                h("svg", {
                  className: "smx-plot", viewBox: "-1 -4 102 108", preserveAspectRatio: "none",
                  role: "img", "aria-label": title + (selected ? " · " + fmtClock(selected[0]) + " · " + series.map(({ label, index }) => label + " " + (Number.isFinite(selected[index]) ? format(selected[index]) : "—")).join(" · ") : ""),
                  tabIndex: 0,
                  onPointerMove: (event) => {
                    const { left, width } = event.currentTarget.getBoundingClientRect();
                    const x = (event.clientX - left) / width * 100;
                    setCursor(history.reduce((nearest, row, i) => Math.abs(position(row) - x) < Math.abs(position(history[nearest]) - x) ? i : nearest, 0));
                  },
                  onPointerLeave: () => setCursor(null),
                  onBlur: () => setCursor(null),
                  onKeyDown: (event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    setCursor(Math.max(0, Math.min(lastIndex, (cursor ?? lastIndex) + (event.key === "ArrowLeft" ? -1 : 1))));
                  },
                },
                  [0, 50, 100].map((y) => h("line", { key: y, x1: 0, y1: y, x2: 100, y2: y, stroke: "var(--dsw-alias-border-l2)", vectorEffect: "non-scaling-stroke" })),
                  cursor !== null && selected ? h("line", { x1: position(selected), x2: position(selected), y1: 0, y2: 100, stroke: "var(--dsw-alias-label-secondary)", strokeDasharray: "3 3", vectorEffect: "non-scaling-stroke" }) : null,
                  series.map(({ label, index, color }, i) => {
                    let drawing = false;
                    const path = history.map((row) => {
                      if (!Number.isFinite(row[index])) { drawing = false; return ""; }
                      const command = drawing ? "L" : "M";
                      drawing = true;
                      const x = position(row), y = 100 - row[index] / scale * 100;
                      return `${command}${x},${y}l0.001,0`;
                    }).join(" ");
                    return h("path", { key: label, d: path, fill: "none", stroke: color, strokeWidth: 2, strokeDasharray: i ? "4 3" : undefined, strokeLinecap: "round", vectorEffect: "non-scaling-stroke" });
                  })),
                h("div", { className: "smx-chartTimes smx-muted", "aria-hidden": "true" },
                  h("span", null, fmtClock(start)), h("span", null, cursor !== null && selected ? fmtClock(selected[0]) : ""), h("span", null, fmtClock(end)))))
          : h("div", { className: "smx-plotEmpty smx-muted" }, tt("hint.chartWaiting")),
        h("div", { className: "smx-chartLegend" }, series.map(({ label, index, color }, i) =>
          h("span", { className: "smx-seriesLegend", key: label },
            h("span", { "aria-hidden": "true", style: { width: 13, borderTop: `2px ${i ? "dashed" : "solid"} ${color}` } }),
            label, h("strong", null, Number.isFinite(selected?.[index]) ? format(selected[index]) : "—")))));
    }

    function SshSetup() {
      const [hosts, setHosts] = useState(null);
      const [error, setError] = useState(null);
      const [selected, setSelected] = useState([]);
      const [copied, setCopied] = useState(false);
      useEffect(() => {
        fetch(API + "/ssh-hosts").then((response) => {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        }).then(setHosts, (failure) => setError(failure.message));
      }, []);
      const examples = selected.length ? selected : ["my-linux-server"];
      const yaml = ["- id: server-pulse", "  config:", "    targets:", ...examples.flatMap((alias) => [
        "      - id: " + JSON.stringify(alias), "        sshHost: " + JSON.stringify(alias),
      ])].join("\n");
      const copyYaml = async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(yaml);
          } else {
            const area = document.createElement("textarea");
            area.value = yaml;
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            area.remove();
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setError(tt("setup.copyFailed"));
        }
      };
      return h("section", { className: "smx-card smx-setup" },
        h("h2", null, tt("setup.hosts")),
        h("p", null, tt("setup.aliasTip")),
        error ? h("p", { role: "alert" }, tt("error.title") + " · " + error) :
          !hosts ? h("p", { role: "status" }, tt("setup.loadingAliases")) :
          hosts.aliases.length ? h("div", { className: "smx-aliases" }, hosts.aliases.map((alias) => h("label", { key: alias },
            h("input", { type: "checkbox", checked: selected.includes(alias), onChange: (event) => {
              const checked = event.target.checked;
              setSelected((previous) => checked ? [...previous, alias] : previous.filter((item) => item !== alias));
            } }),
            alias, hosts.monitored.includes(alias) ? h("span", { className: "smx-muted" }, tt("setup.monitored")) : null))) :
          h("p", { className: "smx-muted" }, tt("setup.noAliases")),
        h("div", { className: "smx-yamlHead" },
          h("span", { className: "smx-muted" }, tt("setup.yaml")),
          h("button", { type: "button", className: "smx-btn smx-btn-sm", onClick: copyYaml }, copied ? "✓ " + tt("setup.copied") : tt("setup.copyYaml"))),
        h("textarea", { readOnly: true, value: yaml, rows: yaml.split("\n").length + 1, "aria-label": tt("setup.yaml"), onFocus: (event) => event.target.select() }),
        h("p", { className: "smx-muted" }, tt("setup.trust")));
    }

    function ServicePanel({ services, history, prom, kuma }) {
      if (!services.length) return h(Card, { title: tt("label.services") }, tt("setup.services"));
      return h(React.Fragment, null,
        h("h2", { className: "smx-sectionTitle" }, tt("label.services")),
        h("p", { className: "smx-muted" }, tt("label.probe")),
        h("div", { className: "smx-grid" },
          h("div", { className: "smx-services wide" }, services.map((service) => {
            const name = SERVICE_LABEL[service.name];
            const recent = history.slice(-24).map((row) => [row[0], row[11]?.[service.name]]);
            const label = tt(service.status === "up" ? "label.serviceUp" : service.status === "down" ? "label.serviceDown" : "label.historyUnknown");
            return h("section", { className: "smx-service", key: service.name },
              h("div", { className: "smx-serviceHead" },
                h("h3", { className: "smx-serviceName" }, service.link
                  ? h("a", { href: service.link, target: "_blank", rel: "noopener noreferrer" }, name + " ↗") : name),
                h("span", { className: "smx-serviceStatus", "data-s": service.status }, service.status === "up" ? "✓ " + label : service.status === "down" ? "× " + label : label)),
              h("span", { className: "smx-servicePort" }, service.url,
                service.latencyMs !== null ? " · " + fmtNum(service.latencyMs, 0) + " ms" : null),
              service.version ? h("div", { className: "smx-muted" }, tt("label.version") + " " + service.version) : null,
              service.database ? h("div", { className: "smx-muted" }, tt("label.database") + " · " + service.database) : null,
              h("div", { className: "smx-beats", role: "img", "aria-label": tt("label.lastSamples") + " · " + name + " · " + tt("label.samples", { n: recent.length }) },
                recent.map(([time, status]) => h("span", { key: time, "aria-hidden": "true", className: "smx-beat", "data-s": status,
                  title: fmtClock(time) + " · " + tt(status === "up" ? "label.serviceUp" : status === "down" ? "label.serviceDown" : "label.historyUnknown"),
                }))));
          }))),
        kuma ? h(React.Fragment, null,
          h("h2", { className: "smx-sectionTitle" }, tt("label.kumaMonitors"), kuma.title ? " · " + kuma.title : null),
          h(Card, null, kuma.monitors.length ? h("div", { className: "smx-scroll" },
            h("table", { className: "smx-table" },
              h("thead", null, h("tr", null, ["label.kumaMonitor", "label.status", "label.kumaUptime", "label.kumaPing"].map((label, i) => h("th", { key: label, scope: "col", className: i > 1 ? "smx-num" : undefined }, tt(label))))),
              h("tbody", null, kuma.monitors.map((monitor) => h("tr", { key: monitor.group + ":" + monitor.id },
                h("td", null, h("strong", null, monitor.name), h("div", { className: "smx-muted" }, monitor.group)),
                h("td", null, tt(["label.down", "label.up", "label.pending", "label.maintenance"][monitor.status] ?? "label.unknown")),
                h("td", { className: "smx-num" }, Number.isFinite(monitor.uptime) ? fmtPct(monitor.uptime * 100) : "—"),
                h("td", { className: "smx-num" }, Number.isFinite(monitor.ping) ? fmtNum(monitor.ping, 0) + " ms" : "—"))))))
            : h("p", { className: "smx-muted" }, tt("hint.kumaEmpty"))))
          : services.some((service) => service.name === "uptime-kuma" && service.status === "up")
            ? h("p", { className: "smx-muted" }, tt("hint.kuma")) : null,
        services.some((service) => service.name === "prometheus") ? h(React.Fragment, null,
        h("h2", { className: "smx-sectionTitle" }, tt("label.promTargets")),
        h(Card, null,
          prom ? h(React.Fragment, null,
            h("div", { className: "smx-chartLegend", style: { margin: "0 0 12px" } },
              h("span", { className: "smx-pill" }, prom.up + " " + tt("label.up")),
              h("span", { className: "smx-pill" }, prom.down + " " + tt("label.down")),
              prom.other ? h("span", { className: "smx-pill" }, prom.other + " " + tt("label.unknown")) : null),
            prom.targets.length > 0 ? h("div", { className: "smx-scroll" },
              h("table", { className: "smx-table" },
                h("thead", null, h("tr", null, [tt("label.jobInstance"), tt("label.status"), tt("label.scrape"), tt("label.duration")].map((label, i) => h("th", { key: i, scope: "col", className: i > 1 ? "smx-num" : undefined }, label)))),
                h("tbody", null, prom.targets.slice().sort((a, b) => Number(b.health === "down") - Number(a.health === "down")).map((target, i) =>
                  h("tr", { key: i },
                    h("td", { className: "smx-wrap" }, h("strong", null, target.job),
                      h("div", { className: "smx-mono smx-muted" }, target.instance),
                      target.lastError ? h("span", { className: "smx-muted smx-scrapeError" }, target.lastError) : null),
                    h("td", null, h("span", { className: "smx-serviceStatus", "data-s": target.health },
                      tt(target.health === "up" ? "label.up" : target.health === "down" ? "label.down" : "label.unknown"))),
                    h("td", { className: "smx-num" }, target.health === "unknown" ? "—" : fmtClock(target.lastScrape)),
                    h("td", { className: "smx-num" }, target.health === "unknown" ? "—" : fmtNum(target.durationMs, 0) + " ms"))))))
              : h("p", { className: "smx-muted" }, tt("hint.promEmpty")))
            : h("span", { className: "smx-muted" }, tt("hint.promUnavailable")))) : null);
    }

    function ProcessTable({ rows }) {
      if (!rows || rows.length === 0) return h("div", { className: "smx-muted" }, tt("empty.noData"));
      return h("table", { className: "smx-table" },
        h("thead", null, h("tr", null,
          h("th", { className: "smx-num", style: { width: 70 } }, "CPU"),
          h("th", { className: "smx-num", style: { width: 70 } }, "MEM"),
          h("th", { className: "smx-num" }, "PID"),
          h("th", null, tt("label.command")))),
        h("tbody", null, rows.map((x) => h("tr", { key: x.pid },
          h("td", { className: "smx-num", style: { color: levelColor(x.cpu) } }, fmtPct(x.cpu)),
          h("td", { className: "smx-num" }, fmtPct(x.mem)),
          h("td", { className: "smx-num" }, x.pid),
          h("td", { className: "smx-mono" }, x.name)))));
    }
    function computeAlerts(d) {
      const out = [];
      const push = (level, key, params) => out.push({ level, key, params });
      if (Number.isFinite(d.cpuPct)) {
        if (d.cpuPct >= 95) push("crit", "alert.cpu", { v: d.cpuPct.toFixed(0) });
        else if (d.cpuPct >= 85) push("warn", "alert.cpu", { v: d.cpuPct.toFixed(0) });
      }
      if (Number.isFinite(d.iowaitPct) && d.iowaitPct >= 20) {
        push(d.iowaitPct >= 50 ? "crit" : "warn", "alert.iowait", { v: d.iowaitPct.toFixed(0) });
      }
      if (d.mem && d.mem.pct >= 85) push(d.mem.pct >= 95 ? "crit" : "warn", "alert.mem", { v: d.mem.pct.toFixed(0) });
      if (d.mem && d.mem.swapPct >= 80) push(d.mem.swapPct >= 95 ? "crit" : "warn", "alert.swap", { v: d.mem.swapPct.toFixed(0) });
      for (const disk of d.disks || []) {
        if (disk.pct >= 80) push(disk.pct >= 90 ? "crit" : "warn", "alert.disk", { m: disk.mount, v: disk.pct.toFixed(0) });
        if (Number.isFinite(disk.inodePct) && disk.inodePct >= 85) push(disk.inodePct >= 95 ? "crit" : "warn", "alert.inode", { m: disk.mount, v: disk.inodePct.toFixed(0) });
      }
      if (d.nproc > 0 && d.load1 / d.nproc >= 1) {
        push(d.load1 / d.nproc >= 2 ? "crit" : "warn", "alert.load", { v: d.load1.toFixed(2), n: d.nproc });
      }
      if (d.tcp && d.tcp.retransPct >= 5) push("warn", "alert.retrans", { v: d.tcp.retransPct.toFixed(1) });
      if (d.procStates && d.procStates.zombie >= 20) push("warn", "alert.zombie", { v: d.procStates.zombie });
      if ((d.failedUnits || []).length > 0) push("warn", "alert.failed", { v: d.failedUnits.length });
      for (const g of d.gpu || []) {
        if (g.utilPct >= 85) push(g.utilPct >= 95 ? "crit" : "warn", "alert.gpu", { i: g.index, v: g.utilPct.toFixed(0) });
      }
      return out;
    }
    //#endregion

    //#region page
    function ServerMonitorPage() {
      const [payload, setPayload] = useState(null);
      const [error, setError] = useState(null);
      const [loading, setLoading] = useState(true);
      const [targetId, setTargetId] = useState(null);
      const [refreshToken, setRefreshToken] = useState(0);
      const [auto, setAuto] = useState(true);
      const [pollMs, setPollMs] = useState(5000);
      const [visible, setVisible] = useState(typeof document === "undefined" || !document.hidden);
      const [tab, setTab] = useState("cpu");
      const [view, setView] = useState("overview");
      const [connection, setConnection] = useState(null);
      const [showHosts, setShowHosts] = useState(false);

      useEffect(() => {
        if (typeof document === "undefined") return;
        const onVisibility = () => setVisible(!document.hidden);
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
      }, []);

      useEffect(() => {
        if (!visible) return; // pause polling while the tab is hidden
        let cancelled = false;
        let timer = null;
        const tick = async () => {
          let nextMs = auto ? pollMs : 0;
          try {
            const res = await fetch(API + "/snapshot", { headers: { accept: "application/json" } });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const json = await res.json();
            if (cancelled) return;
            setPayload(json);
            setError(null);
            setLoading(false);
            const anyOnline = json.snapshots.some((s) => s.status === "online");
            nextMs = auto && json.snapshots.length ? Math.max(json.intervalMs, anyOnline ? pollMs : OFFLINE_MS) : 0;
          } catch (err) {
            if (cancelled) return;
            setError(err && err.message ? err.message : String(err));
            setLoading(false);
            nextMs = auto ? OFFLINE_MS : 0;
          }
          if (!cancelled && nextMs > 0) timer = setTimeout(tick, nextMs);
        };
        tick();
        return () => { cancelled = true; if (timer) clearTimeout(timer); };
      }, [refreshToken, auto, pollMs, visible]);

      const snapshots = payload && Array.isArray(payload.snapshots) ? payload.snapshots : [];
      const snap = snapshots.find((s) => s.id === targetId) || snapshots[0] || null;
      const d = snap && snap.data ? snap.data : null;
      const diagnostic = connection?.id === snap?.id ? connection : null;
      const testConnection = async () => {
        const id = snap.id;
        setConnection({ id, pending: true });
        try {
          const response = await fetch(API + "/connection?target=" + encodeURIComponent(id));
          if (!response.ok) throw new Error("HTTP " + response.status);
          setConnection({ id, ...await response.json() });
        } catch (error) {
          setConnection({ id, ok: false, reason: "other", error: error.message });
        }
      };
      const history = (snap && Array.isArray(snap.history) ? snap.history : []);
      const selectedAt = snap?.lastSuccessfulAt || (snap?.status === "online" ? snap.sampledAt : null);
      const views = [
        ["overview", "nav.overview"], ["compute", "nav.compute"], ["storage", "nav.storage"],
        ["network", "label.network"], ["services", "label.services"],
      ];

      if (!snap && loading) {
        return h("div", { className: "smx-page" }, h(StyleTag, null),
          h("div", { className: "smx-head" }, h("h1", { className: "smx-title" }, tt("panel.title"))),
          h("div", { className: "smx-empty" }, h("div", { className: "smx-spin" }), h("span", null, tt("empty.loading"))),
          h("div", { className: "smx-grid" }, [0, 1, 2, 3].map((i) => h("div", { key: i, className: "smx-card" }, h("div", { className: "smx-skel", style: { width: "40%" } }), h("div", { className: "smx-skel", style: { width: "70%", height: 28, marginTop: 12 } })))));
      }

      const alerts = d ? computeAlerts(d) : [];
      const hasCrit = alerts.some((a) => a.level === "crit");
      const online = snap && snap.status === "online";

      const healthStrip = h("div", { className: "smx-health", role: "group", "aria-label": tt("label.health") },
        snapshots.map((host) => {
          const active = host.status === "online";
          const serviceCount = host.data?.services.filter((service) => service.status === "up").length;
          const hostAlerts = host.data ? computeAlerts(host.data) : [];
          const promDown = host.data?.prometheus?.down;
          return h("button", {
            key: host.id, type: "button", className: "smx-healthHost", "aria-pressed": host.id === snap.id,
            onClick: () => setTargetId(host.id), title: host.label,
          },
            h("span", { className: "smx-healthLed", "data-s": host.status, "aria-hidden": "true" }),
            h("div", { className: "smx-healthMeta" },
              h("div", { className: "smx-healthName" }, host.label),
              h("div", { className: "smx-healthSub smx-mono" }, host.host, host.source === "openssh" ? " · OpenSSH" : null)),
            h("div", { className: "smx-healthInfo" },
              h("strong", null, tt(active ? "label.sshOnline" : "status.offline")),
              active ? h("span", null, tt("health.svcUp", { n: serviceCount }) + " · " + tt("alert.count", { n: hostAlerts.length })) : null,
              active && promDown > 0 ? h("span", { className: "smx-probeWarning" }, tt("label.promDown", { n: promDown })) : null));
        }));
      const header = h("header", { className: "smx-hero" },
        h("div", { className: "smx-head" },
          h("div", { className: "smx-brand" },
            h("span", { className: "smx-logo" }, h(ServerMonitorIcon, { size: 24 })),
            h("div", null, h("h1", { className: "smx-title" }, tt("panel.title")),
              h("div", { className: "smx-sub" }, tt("panel.subtitle")))),
          h("div", { className: "smx-spacer" }),
          h("div", { className: "smx-actions" },
            snap ? h("button", { className: "smx-btn", "aria-pressed": showHosts, onClick: () => setShowHosts((value) => !value) }, tt("setup.hosts")) : null,
            snap ? h("button", { className: "smx-btn", onClick: testConnection, disabled: connection?.pending }, tt(diagnostic?.pending ? "action.sshTesting" : "action.sshTest")) : null,
            h("label", { className: "smx-refresh", title: tt("label.refreshEvery") },
              h("span", { className: "smx-muted" }, tt("label.refreshEvery")),
              h("select", { className: "smx-select", value: pollMs, "aria-label": tt("label.refreshEvery"), onChange: (event) => setPollMs(Number(event.target.value)) },
                [3000, 5000, 10000, 30000].map((ms) => h("option", { key: ms, value: ms }, ms / 1000 + "s")))),
            snap ? h("button", { className: "smx-btn", onClick: () => setAuto((v) => !v) }, tt(auto ? "action.pause" : "action.resume")) : null,
            h("button", { className: "smx-btn", onClick: () => setRefreshToken((n) => n + 1) }, tt("action.refresh")))),
        snap ? h("div", { className: "smx-meta" },
          h("span", { className: "smx-pill" }, tt(auto ? "label.live" : "label.paused")),
          selectedAt ? h("span", null, tt("label.sample") + " ", h("strong", null, fmtClock(selectedAt))) : null,
          snap && !online ? h("span", null, tt("label.lastAttempt") + " " + fmtClock(snap.sampledAt)) : null,
          Number.isFinite(snap?.latencyMs) ? h("span", null, tt("label.latency") + " " + snap.latencyMs + " ms") : null,
          d ? h("span", null, tt("label.uptime") + " " + fmtUptime(d.uptimeSec)) : null) : null);
      const navigation = h("nav", { className: "smx-nav", "aria-label": tt("panel.title") },
        views.map(([id, label]) => h("button", { type: "button", key: id, "aria-pressed": id === view, onClick: () => setView(id) }, tt(label))));

      let body;
      if (payload && !snap && !error) {
        body = h(SshSetup);
      } else if (!snap) {
        body = h("div", { className: "smx-empty" },
          h("div", { className: "smx-banner", "data-kind": "error", style: { maxWidth: 560 } }, h("strong", null, tt("error.title") + ": "), error || tt("empty.noData")),
          h("div", { className: "smx-muted" }, tt("hint.offline")));
      } else if (!online && !d) {
        body = h("div", { className: "smx-empty" },
          h("div", { className: "smx-banner", "data-kind": "error", style: { maxWidth: 620 } }, h("strong", null, tt("empty.offline")), snap.error),
          h("div", { className: "smx-muted" }, tt("ssh." + snap.reason)));
      } else {
        const disks = d.disks || [];
        const nets = d.nets || [];
        const diskIO = d.diskIO || [];
        const services = d.services || [];
        const gpus = d.gpu || [];
        const dockers = d.docker || [];
        const tcpStates = d.tcpStates || {};
        const pstates = d.procStates || {};
        const rootDisk = disks.find((disk) => disk.mount === "/");
        const loadRatio = d.nproc > 0 ? (d.load1 / d.nproc) * 100 : 0;
        const netRx = nets.reduce((s, n) => s + (n.loopback ? 0 : n.rxBps), 0);
        const netTx = nets.reduce((s, n) => s + (n.loopback ? 0 : n.txBps), 0);
        const failedList = (d.failedUnits || []).length === 0
          ? h("span", { className: "smx-muted" }, tt("no.failed"))
          : h("ul", { style: { margin: 0, paddingLeft: 18 } },
              d.failedUnits.map((u, i) => h("li", { key: i, className: "smx-mono" }, String(u).replace(/^[●○]\s*/, ""))));
        const procLine = tt("label.running") + " " + (pstates.running || 0) + " · "
          + tt("label.sleeping") + " " + (pstates.sleeping || 0) + " · "
          + tt("label.blocked") + " " + (pstates.blocked || 0) + " · "
          + tt("label.zombie") + " " + (pstates.zombie || 0);

        const parts = [];

        // Offline / stale banners
        if (error) {
          parts.push(h("div", { className: "smx-banner", "data-kind": "error" }, tt("error.title") + " · " + error + " · " + tt("hint.stale")));
        }
        if (!online) {
          parts.push(h(React.Fragment, null,
            h("div", { className: "smx-banner", "data-kind": "error" },
              h("strong", null, tt("empty.offline") + ": "), snap.error || tt("empty.noData")),
            snap.stale ? h("div", { className: "smx-banner", "data-kind": "warn" }, tt("hint.stale")) : null));
        }

        // Alerts — dual-encoded (color + text), crit first
        if (alerts.length) {
          const ordered = alerts.slice().sort((a, b) => (b.level === "crit" ? 1 : 0) - (a.level === "crit" ? 1 : 0));
          const critN = alerts.filter((a) => a.level === "crit").length;
          const warnN = alerts.length - critN;
          parts.push(h("div", { className: "smx-banner", "data-kind": hasCrit ? "error" : "warn" },
            h("div", { style: { display: "flex", flexDirection: "column", gap: 8, width: "100%" } },
              h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                h("strong", null, tt("alert.count", { n: alerts.length }) + " — "),
                critN ? h("span", { className: "smx-sev", "data-level": "crit" }, tt("sev.crit") + " " + critN) : null,
                warnN ? h("span", { className: "smx-sev", "data-level": "warn" }, tt("sev.warn") + " " + warnN) : null),
              h("ul", { className: "smx-alertList" },
                ordered.map((a, i) => h("li", { key: i },
                  h("span", { className: "smx-dot", style: { display: "inline-block", marginRight: 7, background: a.level === "crit" ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-state-warn-primary)" } }),
                  tt(a.key, a.params)))))));
        }

        if (view === "overview") {
          const [rxValue, rxUnit] = fmtRate(netRx).split(" ");
          const [ioValue, ioUnit] = fmtRate(diskIO.reduce((sum, disk) => sum + disk.readBps + disk.writeBps, 0)).split(" ");
          parts.push(h("div", { className: "smx-grid" },
            h(MetricCard, {
              title: tt("label.cpu"), value: fmtPct(d.cpuPct), pct: d.cpuPct,
              color: metricColor(d.cpuPct, "var(--acc-blue)", 85, 95),
              sub: tt("label.cores") + " " + d.nproc,
              foot: [
                h("span", { key: "io" }, tt("label.iowait") + " " + fmtPct(d.iowaitPct)),
                h("span", { key: "sys" }, tt("label.system") + " " + fmtPct(d.systemPct)),
              ],
            }),
            h(MetricCard, {
              title: tt("label.memory"), value: fmtPct(d.mem ? d.mem.pct : null), pct: d.mem ? d.mem.pct : null,
              color: metricColor(d.mem.pct, "var(--acc-purple)", 85, 95),
              sub: d.mem ? fmtBytes(d.mem.usedBytes) + " / " + fmtBytes(d.mem.totalBytes) : "",
              foot: d.mem && d.mem.swapTotalBytes > 0 ? [h("span", { key: "swap" }, tt("label.swap") + " " + fmtPct(d.mem.swapPct))] : null,
            }),
            h(MetricCard, {
              title: tt("label.load"), value: d.load1 != null ? d.load1.toFixed(2) : "—", unit: "1m", pct: loadRatio,
              color: metricColor(loadRatio, "var(--acc-blue)", 100, 200),
              sub: `${d.load5 != null ? d.load5.toFixed(2) : "—"} / ${d.load15 != null ? d.load15.toFixed(2) : "—"} (5m/15m)`,
            }),
            h(MetricCard, {
              title: tt("label.network") + " · " + tt("label.rx"), value: rxValue, unit: rxUnit, color: "var(--acc-cyan)",
              sub: tt("label.tx") + " " + fmtRate(netTx),
              foot: [h("span", { key: "est" }, tt("label.established") + " " + (tcpStates.ESTAB || 0))],
            }),
            h(MetricCard, {
              title: tt("label.diskio"), value: ioValue, unit: ioUnit,
              color: "var(--acc-green)",
              sub: diskIO.length ? diskIO[0].dev + " · " + tt("label.util") + " " + fmtPct(diskIO[0].utilPct) : tt("no.disk"),
            }),
            h(MetricCard, {
              title: tt("label.rootDisk"), value: rootDisk ? fmtPct(rootDisk.pct) : "—", pct: rootDisk?.pct,
              color: metricColor(rootDisk?.pct, "var(--acc-blue)", 80, 90),
              sub: rootDisk ? tt("label.rootFree", { v: fmtBytes(rootDisk.availBytes) }) : null,
            })));
          parts.push(h("h2", { className: "smx-sectionTitle" }, tt("label.history"), " · ", h("span", { className: "smx-muted" }, tt("label.samples", { n: history.length }))));
          const charts = [
            ["label.cpu", "percent", [["label.cpu", 1, "var(--acc-blue)"], ["label.iowait", 7, "var(--acc-amber)"]]],
            ["label.memory", "percent", [["label.memory", 2, "var(--acc-purple)"], ["label.swap", 8, "var(--acc-pink)"]]],
            ["label.network", "rate", [["label.rx", 4, "var(--acc-cyan)"], ["label.tx", 5, "var(--acc-blue)"]]],
            ["label.diskio", "rate", [["label.read", 9, "var(--acc-green)"], ["label.write", 10, "var(--acc-amber)"]]],
          ];
          parts.push(h("div", { className: "smx-grid smx-chartGrid", key: snap.id },
            charts.map(([label, unit, series]) => h(TrendChart, { key: label, title: tt(label), history, unit,
              series: series.map(([name, index, color]) => ({ label: tt(name), index, color })),
            }))));
        }

        if (view === "services") {
          parts.push(h(ServicePanel, { services, history, prom: d.prometheus, kuma: d.kuma }));
        }

        if (view === "storage") {
          parts.push(h("h2", { className: "smx-sectionTitle" }, tt("label.disks")));
          parts.push(h("div", { className: "smx-grid two" },
            h(Card, { wide: true, title: tt("label.mounts", { n: disks.length }) },
              disks.length ? h("div", { className: "smx-scroll" },
                h("table", { className: "smx-table" },
                  h("thead", null, h("tr", null, ["mount", "used", "avail", "total", "inode", "util"].map((key, i) => h("th", { key, scope: "col", className: i > 0 ? "smx-num" : undefined }, tt("label." + key))))),
                  h("tbody", null, disks.map((disk) => h("tr", { key: disk.mount },
                    h("td", { className: "smx-wrap" }, h("strong", null, disk.mount), h("div", { className: "smx-mono smx-muted" }, disk.filesystem)),
                    h("td", { className: "smx-num" }, fmtBytes(disk.usedBytes)),
                    h("td", { className: "smx-num" }, fmtBytes(disk.availBytes)),
                    h("td", { className: "smx-num" }, fmtBytes(disk.totalBytes)),
                    h("td", { className: "smx-num" }, fmtPct(disk.inodePct)),
                    h("td", { className: "smx-num", style: { minWidth: 88 } }, fmtPct(disk.pct),
                      h(Bar, { pct: disk.pct, label: disk.mount, color: metricColor(disk.pct, "var(--dsw-alias-state-success-primary)", 80, 90) })))))))
                : h("span", { className: "smx-muted" }, tt("no.disk"))),
            h(Card, { title: tt("label.diskio"), wide: true },
              diskIO.length ? h("div", { className: "smx-scroll" },
                h("table", { className: "smx-table" },
                  h("thead", null, h("tr", null, ["device", "read", "write", "readLatency", "writeLatency", "inFlight", "util"].map((key, i) => h("th", { key, scope: "col", className: i > 0 ? "smx-num" : undefined }, tt("label." + key))))),
                  h("tbody", null, diskIO.map((disk) => h("tr", { key: disk.dev },
                    h("td", { className: "smx-mono" }, disk.dev),
                    h("td", { className: "smx-num" }, fmtRate(disk.readBps), h("div", { className: "smx-muted" }, fmtNum(disk.readIops, 1) + " IOPS")),
                    h("td", { className: "smx-num" }, fmtRate(disk.writeBps), h("div", { className: "smx-muted" }, fmtNum(disk.writeIops, 1) + " IOPS")),
                    h("td", { className: "smx-num" }, disk.readLatencyMs === null ? "—" : fmtNum(disk.readLatencyMs, 1) + " ms"),
                    h("td", { className: "smx-num" }, disk.writeLatencyMs === null ? "—" : fmtNum(disk.writeLatencyMs, 1) + " ms"),
                    h("td", { className: "smx-num" }, disk.inFlight),
                    h("td", { className: "smx-num" }, fmtPct(disk.utilPct)))))))
                : h("span", { className: "smx-muted" }, tt("no.disk")))));
        }

        if (view === "network") {
          // Network
          parts.push(h("h2", { className: "smx-sectionTitle" }, tt("label.network")));
          parts.push(h("div", { className: "smx-grid two" },
            h(Card, { title: tt("label.network") },
              nets.length === 0
                ? h("span", { className: "smx-muted" }, tt("no.network"))
                : h("div", { className: "smx-scroll" }, h("table", { className: "smx-table" },
                    h("thead", null, h("tr", null,
                      h("th", null, tt("label.interface")), h("th", null, tt("label.rx")),
                      h("th", null, tt("label.tx")), h("th", null, tt("label.drops")), h("th", null, tt("label.total")))),
                    h("tbody", null, nets.map((x, i) => h("tr", { key: i },
                      h("td", { className: "smx-mono" }, x.iface),
                      h("td", { className: "smx-num" }, fmtRate(x.rxBps)),
                      h("td", { className: "smx-num" }, fmtRate(x.txBps)),
                      h("td", { className: "smx-num" }, fmtNum(x.dropsPerSec, 1)),
                      h("td", { className: "smx-num smx-muted" }, "↓" + fmtBytes(x.rxTotal) + " ↑" + fmtBytes(x.txTotal)))))))),
            h(Card, { title: tt("label.tcp") },
              h("div", { className: "smx-kv" },
                h(KV, { label: tt("label.established"), value: tcpStates.ESTAB || 0 }),
                h(KV, { label: "LISTEN", value: tcpStates.LISTEN || 0 }),
                h(KV, { label: "TIME-WAIT", value: tcpStates["TIME-WAIT"] || 0 }),
                d.tcp ? h(KV, { label: tt("label.retrans"), value: fmtPct(d.tcp.retransPct) + " (" + fmtNum(d.tcp.retransPerSec, 1) + "/s)" }) : null,
                h(KV, { label: tt("label.context"), value: fmtNum(d.ctxtPerSec, 0) + "/s" }),
                h(KV, { label: tt("label.interrupts"), value: fmtNum(d.intrPerSec, 0) + "/s" })))));
        }

        if (view === "compute") {
          parts.push(h("h2", { className: "smx-sectionTitle" }, tt("label.pressure")));
          parts.push(h(Card, null,
            h("div", { className: "smx-muted" }, tt("hint.pressure")),
            h("dl", { className: "smx-pressure" }, [["cpu", "label.cpu"], ["memory", "label.memory"], ["io", "label.diskio"]].map(([id, label]) =>
              h("div", { key: id }, h("dt", null, tt(label)), h("dd", null, fmtPct(d.pressure[id])))))));
          parts.push(h(TrendChart, { key: snap.id, title: tt("label.load") + " · 1m", history, unit: "load",
            series: [{ label: tt("label.load"), index: 3, color: "var(--acc-blue)" }],
          }));

          // GPU / Docker
          if (gpus.length || dockers.length) {
            parts.push(h("h2", { className: "smx-sectionTitle" }, tt("label.gpu") + " / " + tt("label.docker")));
            parts.push(h("div", { className: "smx-grid two" },
              h(Card, { title: tt("label.gpu"), right: h("span", { className: "smx-muted" }, gpus.length ? gpus.length + " × NVIDIA" : "") },
                gpus.length === 0
                  ? h("span", { className: "smx-muted" }, tt("no.gpu"))
                  : gpus.map((g, i) => h("div", { key: i, style: { marginBottom: 12 } },
                      h("div", { style: { display: "flex", justifyContent: "space-between" } },
                        h("span", { className: "smx-mono" }, "GPU " + g.index + " · " + g.name),
                        h("span", { className: "smx-num", style: { color: levelColor(g.utilPct) } }, fmtPct(g.utilPct))),
                      h(Bar, { pct: g.utilPct, label: "GPU " + g.index, color: levelColor(g.utilPct) }),
                      h("div", { className: "smx-muted", style: { marginTop: 4 } },
                        tt("label.memUse") + " " + fmtBytes(g.memUsedMiB * 1048576) + " / " + fmtBytes(g.memTotalMiB * 1048576))))),
              h(Card, { title: tt("label.docker") },
                dockers.length === 0
                  ? h("span", { className: "smx-muted" }, tt("no.docker"))
                  : h("table", { className: "smx-table" },
                      h("thead", null, h("tr", null,
                        h("th", null, tt("label.name")), h("th", { className: "smx-num" }, tt("label.cpu")), h("th", { className: "smx-num" }, tt("label.memory")))),
                      h("tbody", null, dockers.map((x, i) => h("tr", { key: i },
                        h("td", { className: "smx-mono" }, x.name),
                        h("td", { className: "smx-num", style: { color: levelColor(x.cpuPct) } }, fmtPct(x.cpuPct)),
                        h("td", { className: "smx-num" }, fmtBytes(x.memUsedMiB * 1048576)))))))));
          }

          // Processes
          parts.push(h("h2", { className: "smx-sectionTitle" }, tt("label.processes")));
          parts.push(h(Card, { wide: true, right: h("div", { className: "smx-tabs", role: "group", "aria-label": tt("label.processes") },
            h("button", { className: "smx-tab", "aria-pressed": tab === "cpu", onClick: () => setTab("cpu") }, tt("label.cpuTop")),
            h("button", { className: "smx-tab", "aria-pressed": tab === "mem", onClick: () => setTab("mem") }, tt("label.memTop"))) },
            h(ProcessTable, { rows: tab === "cpu" ? d.top : d.topMem })));

          // Host info + failed units
          parts.push(h("h2", { className: "smx-sectionTitle" }, tt("label.host")));
          parts.push(h("div", { className: "smx-grid two" },
            h(Card, { title: tt("label.host") },
              h("div", { className: "smx-kv" },
                h(KV, { label: tt("label.host"), value: d.hostname || snap.host }),
                h(KV, { label: tt("label.os"), value: d.os || "—" }),
                h(KV, { label: tt("label.kernel"), value: d.kernel || "—" }),
                h(KV, { label: tt("label.uptime"), value: fmtUptime(d.uptimeSec) }),
                h(KV, { label: tt("label.cores"), value: d.nproc || "—" }),
                h(KV, { label: tt("label.users"), value: d.users != null ? d.users : "—" }))),
            h(Card, { title: tt("label.failed") },
              failedList,
              h("div", { className: "smx-muted", style: { marginTop: 10 } }, procLine))));

        }

        body = h(React.Fragment, null, ...parts);
      }

      return h("div", { className: "smx-page" }, h(StyleTag, null),
        h("div", { className: "smx-shell" }, header,
          diagnostic ? h("div", { className: "smx-card smx-diagnostic", role: "status" },
            diagnostic.pending ? tt("action.sshTesting") : diagnostic.ok ? tt("ssh.success", { ms: diagnostic.latencyMs }) : tt("ssh." + diagnostic.reason),
            diagnostic.error ? h("pre", null, diagnostic.error) : null) : null,
          showHosts && snap ? h(SshSetup) : null,
          snap ? healthStrip : null, d ? navigation : null, body));
    }
    //#endregion

    //#region slots
    function ServerMonitorIcon({ size }) {
      const s = size || 18;
      return h("svg", {
        viewBox: "0 0 16 16", width: s, height: s, fill: "none",
        stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round",
        "data-dsh-panel-entry": PANEL_ID, "aria-hidden": "true",
      },
        h("rect", { x: "2", y: "2.4", width: "12", height: "4.2", rx: "1.2" }),
        h("rect", { x: "2", y: "9.4", width: "12", height: "4.2", rx: "1.2" }),
        h("line", { x1: "4.6", y1: "4.5", x2: "4.7", y2: "4.5" }),
        h("line", { x1: "4.6", y1: "11.5", x2: "4.7", y2: "11.5" }),
        h("polyline", { points: "8 6.6 8 7.6 12 7.6 12 9.2" }));
    }

    const inject = ["slots", "locale", "layout"];

    function apply(ctx) {
      ctx.effect(() => {
        try { return ctx.locale.register(NS, dictionaries); } catch { return () => {}; }
      }, "server-pulse: dictionaries");
      try { translate = ctx.locale.bind(NS); } catch {}

      ctx.effect(() => {
        const disposers = [];
        const slots = ctx.slots;
        try {
          disposers.push(slots.inject("sidebar.panellist", () => slots.register({
            name: "sidebar.panellist", id: PANEL_ID, order: PANEL_ORDER,
            label: () => tt("entry.label"),
          }, ServerMonitorIcon)));
          disposers.push(slots.inject("main", () => slots.register({
            name: "main", key: PANEL_ID,
          }, ServerMonitorPage)));
        } catch (error) {
          console.warn("[server-pulse] panel registration failed:", error);
        }
        return () => { for (const dispose of disposers.splice(0)) dispose(); };
      }, "server-pulse: ui mounts");
    }
    //#endregion

    return { inject, apply };
  },
});
