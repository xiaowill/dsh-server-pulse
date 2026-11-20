/**
 * Host half of the Server Monitor plugin.
 *
 * Read-only: it samples a Linux host over SSH (batch mode, no TTY) by reading
 * /proc and a handful of plain commands, then exposes the parsed snapshot over
 * a loopback-only HTTP route for the Client panel to poll.
 *
 * Nothing is written on the remote host. Every command is read-only and
 * guarded with `timeout` where it could block.
 */
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

export const name = "server-monitor";
export const inject = ["webServer"];

const SERVICE_NAMES = new Set(["grafana", "prometheus", "uptime-kuma", "node-exporter"]);
const REQUIRE_LINUX = 'if ! [[ -r /proc/stat && -r /proc/meminfo ]]; then echo DSH_REQUIRES_LINUX >&2; exit 1; fi\n';

/**
 * One command sent to the remote shell. Each section is a `@@KEY` marker line
 * followed by raw lines. CPU / net / IO rates come from two reads 0.6 s apart.
 * Monitoring service base URLs arrive as arguments from the local profile.
 */
const REMOTE_SCRIPT = REQUIRE_LINUX + String.raw`
echo @@T0; date +%s.%N
echo @@CPU1; grep '^cpu ' /proc/stat
echo @@CTXT1; grep -E '^(ctxt|intr) ' /proc/stat | cut -d' ' -f1,2
echo @@DISKSTAT1; cat /proc/diskstats
echo @@NET1; cat /proc/net/dev
echo @@SNMP1; grep '^Tcp:' /proc/net/snmp
echo @@HOST; hostname 2>/dev/null || cat /proc/sys/kernel/hostname
echo @@OS; sed -n 's/^PRETTY_NAME=//p' /etc/os-release 2>/dev/null | head -1
echo @@KERNEL; uname -r
echo @@UPTIME; cut -d' ' -f1 /proc/uptime
for resource in cpu memory io; do
  echo "@@PSI_$resource"
  if [ -r "/proc/pressure/$resource" ]; then cat "/proc/pressure/$resource"; fi
done
echo @@LOADAVG; cut -d' ' -f1-3 /proc/loadavg
echo @@NPROC; nproc 2>/dev/null || grep -c '^processor' /proc/cpuinfo
echo @@MEMINFO; cat /proc/meminfo
echo @@DF; df -P -B1 2>/dev/null
echo @@DFI; df -i -P 2>/dev/null
sleep 0.6
echo @@T1; date +%s.%N
echo @@CPU2; grep '^cpu ' /proc/stat
echo @@CTXT2; grep -E '^(ctxt|intr) ' /proc/stat | cut -d' ' -f1,2
echo @@DISKSTAT2; cat /proc/diskstats
echo @@NET2; cat /proc/net/dev
echo @@SNMP2; grep '^Tcp:' /proc/net/snmp
echo @@TOP; ps -eo pid=,pcpu=,pmem=,comm= --sort=-pcpu 2>/dev/null | head -8
echo @@TOPMEM; ps -eo pid=,pcpu=,pmem=,comm= --sort=-pmem 2>/dev/null | head -6
echo @@PROCSTATE; ps -eo stat= 2>/dev/null | cut -c1 | sort | uniq -c
echo @@TCPSTATE; ss -tan 2>/dev/null | awk 'NR>1 {c[$1]++} END {for (k in c) print k, c[k]}'
echo @@WHO; who 2>/dev/null | wc -l
echo @@FAILED
if command -v systemctl >/dev/null 2>&1; then timeout 2 systemctl --failed --no-legend --no-pager 2>/dev/null | head -8; fi
echo @@GPU
if command -v nvidia-smi >/dev/null 2>&1; then timeout 2 nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null | head -8; fi
echo @@DOCKER
if command -v docker >/dev/null 2>&1; then timeout 3 docker stats --no-stream --format '{{.Name}} | {{.CPUPerc}} | {{.MemUsage}}' 2>/dev/null | head -8; fi
echo @@SERVICES
if [ "$#" -gt 0 ] && command -v curl >/dev/null 2>&1; then
  probe() {
    local result code elapsed
    if result=$(curl -q --globoff -fs -m 1 -o /dev/null -w '%{http_code} %{time_total}' -- "$2") && [[ $result == '200 '* ]]; then
      read -r code elapsed <<< "$result"
      echo "$1 up $elapsed"
    else
      echo "$1 down"
      return 1
    fi
  }
  prom_url=
  while [ "$#" -gt 0 ]; do
    name=$1
    base=$2
    shift 2
    case "$name" in
      grafana) (probe "$name" "$base/api/health") & ;;
      uptime-kuma) (probe "$name" "$base/api/entry-page") & ;;
      node-exporter) (probe "$name" "$base/metrics") & ;;
      prometheus)
        if probe "$name" "$base/-/ready"; then prom_url=$base; fi
        ;;
    esac
  done
  wait
  echo @@PROM_TARGETS
  if [ -n "$prom_url" ]; then
    if response=$(curl -q --globoff -fs -m 2 -w '\n%{http_code} %{content_type}' -- "$prom_url/api/v1/targets?state=active") &&
      [[ $(tail -n 1 <<< "$response") == '200 application/json'* ]]; then
      sed '$d' <<< "$response"
    fi
  fi
fi
echo @@END
`;

export function parseSections(text) {
  const out = {};
  let current = null;
  for (const line of String(text).split(/\r?\n/)) {
    if (line.startsWith("@@")) {
      current = line.slice(2).trim();
      out[current] = [];
    } else if (current !== null) {
      out[current].push(line);
    }
  }
  return out;
}

function firstLine(section) {
  if (!Array.isArray(section)) return "";
  for (const line of section) {
    const t = line.trim();
    if (t !== "") return t;
  }
  return "";
}

function parseCpuLine(line) {
  const nums = String(line).trim().split(/\s+/).slice(1, 9).map((n) => Number(n) || 0);
  return {
    fields: nums,
    total: nums.reduce((a, b) => a + b, 0),
    idleAll: (nums[3] || 0) + (nums[4] || 0),
  };
}

function parseMeminfo(lines) {
  const map = {};
  for (const line of lines) {
    const m = /^([A-Za-z_()]+):\s+(\d+)\s*kB/.exec(line.trim());
    if (m) map[m[1]] = Number(m[2]);
  }
  return map;
}

function parseNetDev(lines) {
  const map = {};
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const iface = line.slice(0, idx).trim();
    if (iface === "" || /Inter-|face/.test(iface)) continue;
    const v = line.slice(idx + 1).trim().split(/\s+/).map((n) => Number(n) || 0);
    if (v.length < 16) continue;
    map[iface] = { rx: v[0], tx: v[8], rxErr: v[2], txErr: v[10], rxDrop: v[3], txDrop: v[11] };
  }
  return map;
}

function parseDiskstats(lines) {
  const map = {};
  for (const line of lines) {
    const v = line.trim().split(/\s+/);
    if (v.length < 13) continue;
    const name = v[2];
    // Whole physical devices only; partitions/loops would double-count.
    if (!/^(sd[a-z]+|nvme\d+n\d+|vd[a-z]+|xvd[a-z]+|hd[a-z]+|mmcblk\d+)$/.test(name)) continue;
    map[name] = {
      reads: Number(v[3]) || 0,
      sectorsRead: Number(v[5]) || 0,
      readMs: Number(v[6]),
      writes: Number(v[7]) || 0,
      sectorsWritten: Number(v[9]) || 0,
      writeMs: Number(v[10]),
      inFlight: Number(v[11]),
      ioTicks: Number(v[12]) || 0,
    };
  }
  return map;
}

function parseCounters(lines) {
  const map = {};
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && Number.isFinite(Number(parts[1]))) map[parts[0]] = Number(parts[1]);
  }
  return map;
}

function parseSnmpTcp(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const values = lines[i].trim().split(/\s+/);
    const fields = lines[i - 1]?.trim().split(/\s+/);
    if (values[0] !== "Tcp:" || fields?.[1] !== "RtoAlgorithm" || values.length !== fields.length) continue;
    const counters = Object.fromEntries(fields.slice(1).map((field, j) => [field, Number(values[j + 1])]));
    return { currEstab: counters.CurrEstab, inSegs: counters.InSegs, outSegs: counters.OutSegs, retransSegs: counters.RetransSegs };
  }
  return null;
}

function parseDf(lines) {
  const disks = [];
  const seen = new Set();
  for (const line of lines) {
    const t = line.trim();
    if (t === "" || /^Filesystem\s/.test(t)) continue;
    const parts = t.split(/\s+/);
    if (parts.length < 6) continue;
    const [fs] = parts;
    const blocks = Number(parts[1]);
    const used = Number(parts[2]);
    const avail = Number(parts[3]);
    const cap = parts[4];
    const mount = parts.slice(5).join(" ");
    if (!Number.isFinite(blocks) || blocks <= 0) continue;
    if (SKIP_FS.has(fs)) continue;
    if (fs === "overlay" && mount !== "/") continue;
    if (/^\/(snap|sys|proc|dev|run)(\/|$)/.test(mount) && mount !== "/") continue;
    if (/^\/(var\/lib\/docker|var\/lib\/containers)(\/|$)/.test(mount)) continue;
    if (seen.has(mount)) continue;
    seen.add(mount);
    const pct = Number(String(cap).replace("%", ""));
    disks.push({
      filesystem: fs,
      mount,
      totalBytes: blocks,
      usedBytes: used,
      availBytes: avail,
      pct: Number.isFinite(pct) ? pct : blocks > 0 ? Math.round((used / blocks) * 100) : 0,
    });
  }
  disks.sort((a, b) => (a.mount === "/" ? -1 : b.mount === "/" ? 1 : b.totalBytes - a.totalBytes));
  return disks;
}

const SKIP_FS = new Set([
  "tmpfs", "devtmpfs", "udev", "squashfs", "nsfs", "proc", "sysfs", "cgroup",
  "cgroup2", "devpts", "mqueue", "hugetlbfs", "debugfs", "tracefs",
  "securityfs", "pstore", "bpf", "autofs", "fusectl", "configfs", "ramfs",
  "rpc_pipefs", "efivarfs", "binfmt_misc", "fuse.gvfsd-fuse",
]);

function parseInodes(lines) {
  const map = {};
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 6 || /^Filesystem/.test(parts[0])) continue;
    map[parts.slice(5).join(" ")] = Number(String(parts[4]).replace("%", "")) || 0;
  }
  return map;
}

function parseTop(lines, limit = 6) {
  const rows = [];
  for (const line of lines) {
    const m = /^\s*(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/.exec(line);
    if (!m) continue;
    rows.push({ pid: Number(m[1]), cpu: Number(m[2]), mem: Number(m[3]), name: m[4].trim() });
  }
  return rows.slice(0, limit);
}

function parseProcStates(lines) {
  const out = { total: 0, running: 0, sleeping: 0, blocked: 0, zombie: 0 };
  for (const line of lines) {
    const m = /^\s*(\d+)\s+([A-Z])\s*$/.exec(line);
    if (!m) continue;
    const n = Number(m[1]);
    out.total += n;
    if (m[2] === "R") out.running += n;
    else if (m[2] === "S" || m[2] === "I") out.sleeping += n;
    else if (m[2] === "D") out.blocked += n;
    else if (m[2] === "Z") out.zombie += n;
  }
  return out;
}

function parseTcpStates(lines) {
  const map = {};
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length === 2 && Number.isFinite(Number(parts[1]))) map[parts[0]] = Number(parts[1]);
  }
  return map;
}

function parseGpu(lines) {
  const out = [];
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length < 5) continue;
    const n = (s) => Number(String(s).replace(/[^\d.]/g, "")) || 0;
    out.push({ index: n(parts[0]), name: parts[1], utilPct: n(parts[2]), memUsedMiB: n(parts[3]), memTotalMiB: n(parts[4]) });
  }
  return out.sort((a, b) => a.index - b.index);
}

function parseMiB(value) {
  const m = /^([\d.]+)\s*(MiB|GiB|KiB|B)?/i.exec(String(value).trim());
  if (!m) return 0;
  const n = Number(m[1]) || 0;
  const unit = (m[2] || "MiB").toLowerCase();
  if (unit === "gib") return n * 1024;
  if (unit === "kib") return n / 1024;
  if (unit === "b") return n / 1048576;
  return n;
}

function parseDocker(lines) {
  const out = [];
  for (const line of lines) {
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length < 3) continue;
    const memParts = parts[2].split("/");
    const used = parseMiB(memParts[0]);
    const total = parseMiB(memParts[1] || "0");
    out.push({
      name: parts[0],
      cpuPct: Number(String(parts[1]).replace("%", "")) || 0,
      memUsedMiB: used,
      memTotalMiB: total,
      memPct: total > 0 ? (used / total) * 100 : 0,
    });
  }
  return out.sort((a, b) => b.cpuPct - a.cpuPct).slice(0, 8);
}

function parseServices(lines) {
  const services = {};
  for (const line of lines) {
    const [name, status, elapsed] = line.trim().split(/\s+/);
    if (!SERVICE_NAMES.has(name) || (status !== "up" && status !== "down")) continue;
    services[name] = { status, latencyMs: status === "up" ? Number(elapsed) * 1000 : null };
  }
  return services;
}

function parsePromTargets(section) {
  const json = section?.join("\n").trim();
  if (!json) return null;
  const { data } = JSON.parse(json);
  const targets = data.activeTargets.map((target) => ({
    job: target.labels.job,
    instance: target.labels.instance,
    health: target.health,
    lastScrape: target.lastScrape,
    durationMs: target.lastScrapeDuration * 1000,
    lastError: target.lastError,
  }));
  const summary = { up: 0, down: 0, other: 0 };
  for (const target of targets) {
    summary[target.health === "up" || target.health === "down" ? target.health : "other"]++;
  }
  return { ...summary, targets };
}

function expandHome(p) {
  if (typeof p !== "string" || p === "") return p;
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function runSsh(target, cfg, command, script) {
  return new Promise((resolve, reject) => {
    const connectSec = Math.ceil(cfg.connectTimeoutMs / 1000);
    const args = [
      ...(target.keyPath ? ["-i", target.keyPath, "-o", "IdentitiesOnly=yes"] : []),
      "-o", "BatchMode=yes",
      "-o", "StrictHostKeyChecking=yes",
      "-o", "ClearAllForwardings=yes",
      "-o", "ForwardAgent=no",
      "-o", `ConnectTimeout=${connectSec}`,
      "-o", "ControlPath=none",
      "-p", String(target.port),
      "-l", target.user,
      "--", target.host,
      command,
    ];
    let child;
    try {
      child = spawn(cfg.sshPath, args, { stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) {
      reject(error);
      return;
    }
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch {}
      finish(reject, new Error(`ssh timed out after ${cfg.connectTimeoutMs + 4000}ms`));
    }, cfg.connectTimeoutMs + 4000);
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (error) => finish(reject, error));
    child.on("close", (code) => {
      if (code === 0) finish(resolve, stdout);
      else finish(reject, new Error((stderr.trim() || `ssh exited with code ${code}`).slice(0, 500)));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(script);
  });
}

function sshFailure(error) {
  const message = error.message;
  if (/host key verification failed|host identification has changed|host key is known/i.test(message)) return "host-key";
  if (/permission denied|no such identity|load key|authentication failed|no mutual signature/i.test(message)) return "auth";
  if (/timed out|connection refused|connection reset|no route to host|network is unreachable|could not resolve|connection closed/i.test(message)) return "network";
  if (/DSH_REQUIRES_LINUX/.test(message)) return "linux";
  return "other";
}

export async function collectSnapshot(target, cfg, previous) {
  const startedAt = Date.now();
  try {
    // OpenSSH sends a single remote command string. Quote each configured URL as one shell argument.
    const serviceArgs = target.services.flatMap(({ name, url }) => [name, "'" + url.replaceAll("'", "'\\''") + "'"]);
    const raw = await runSsh(target, cfg, ["bash -s --", ...serviceArgs].join(" "), REMOTE_SCRIPT);
    const data = buildSnapshot(parseSections(raw));
    data.services = target.services.map((service) => ({
      ...service,
      status: "unknown",
      latencyMs: null,
      ...data.services[service.name],
    }));
    return {
      id: target.id,
      label: target.label,
      host: target.host,
      user: target.user,
      status: "online",
      sampledAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      data,
    };
  } catch (error) {
    return {
      id: target.id,
      label: target.label,
      host: target.host,
      user: target.user,
      status: "offline",
      reason: sshFailure(error),
      error: error instanceof Error ? error.message : String(error),
      sampledAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      data: previous?.data,
      lastSuccessfulAt: previous?.sampledAt,
      stale: previous?.data !== undefined,
    };
  }
}

/** Turn parsed sections into the JSON payload the Client renders. */
export function buildSnapshot(sec) {
  const t0 = Number(firstLine(sec.T0));
  const t1 = Number(firstLine(sec.T1));
  const dt = Number.isFinite(t1) && Number.isFinite(t0) && t1 > t0 ? t1 - t0 : 0;

  let cpuPct = null;
  let iowaitPct = 0;
  let systemPct = 0;
  if (sec.CPU1 && sec.CPU2) {
    const a = parseCpuLine(firstLine(sec.CPU1));
    const b = parseCpuLine(firstLine(sec.CPU2));
    const dTotal = b.total - a.total;
    if (dTotal > 0) {
      // /proc/stat cpu fields: 0=user 1=nice 2=system 3=idle 4=iowait
      // 5=irq 6=softirq 7=steal. Follow Grafana/node_exporter convention:
      // busy% = 100 - idle% (iowait counts as busy), and report iowait
      // separately from field 4. Previously iowaitPct read field 3 (idle)
      // and cpuPct subtracted idle+iowait, inverting both numbers.
      const dIdle = b.fields[3] - a.fields[3];
      const dIowait = b.fields[4] - a.fields[4];
      cpuPct = Math.max(0, Math.min(100, (1 - dIdle / dTotal) * 100));
      iowaitPct = Math.max(0, Math.min(100, (dIowait / dTotal) * 100));
      systemPct = Math.max(0, Math.min(100, ((b.fields[2] - a.fields[2]) / dTotal) * 100));
    }
  }

  const ctxt0 = parseCounters(sec.CTXT1 || []);
  const ctxt1 = parseCounters(sec.CTXT2 || []);
  const ctxtPerSec = dt > 0 ? Math.max(0, ((ctxt1.ctxt || 0) - (ctxt0.ctxt || 0)) / dt) : 0;
  const intrPerSec = dt > 0 ? Math.max(0, ((ctxt1.intr || 0) - (ctxt0.intr || 0)) / dt) : 0;

  const mem = parseMeminfo(sec.MEMINFO || []);
  const memTotal = (mem.MemTotal || 0) * 1024;
  const memAvail = (mem.MemAvailable ?? ((mem.MemFree || 0) + (mem.Buffers || 0) + (mem.Cached || 0))) * 1024;
  const memUsed = Math.max(0, memTotal - memAvail);
  const swapTotal = (mem.SwapTotal || 0) * 1024;
  const swapFree = (mem.SwapFree || 0) * 1024;
  const swapUsed = Math.max(0, swapTotal - swapFree);

  const net1 = parseNetDev(sec.NET1 || []);
  const net2 = parseNetDev(sec.NET2 || []);
  const DROP_IFACE = /^(veth|docker|br-|virbr|tap|tun|vnet|dummy|kube)/;
  const nets = [];
  const ifaces = new Set([...Object.keys(net1), ...Object.keys(net2)]);
  for (const iface of ifaces) {
    if (DROP_IFACE.test(iface)) continue;
    const a = net1[iface];
    const b = net2[iface];
    if (!a || !b) continue;
    nets.push({
      iface,
      loopback: iface === "lo",
      rxTotal: b.rx,
      txTotal: b.tx,
      rxBps: dt > 0 ? Math.max(0, b.rx - a.rx) / dt : 0,
      txBps: dt > 0 ? Math.max(0, b.tx - a.tx) / dt : 0,
      rxErr: Math.max(0, b.rxErr - a.rxErr),
      txErr: Math.max(0, b.txErr - a.txErr),
      dropsPerSec: dt > 0 ? (Math.max(0, b.rxDrop - a.rxDrop) + Math.max(0, b.txDrop - a.txDrop)) / dt : null,
    });
  }
  nets.sort((a, b) => (a.loopback ? 1 : b.loopback ? -1 : b.rxBps + b.txBps - (a.rxBps + a.txBps)));

  const disk1 = parseDiskstats(sec.DISKSTAT1 || []);
  const disk2 = parseDiskstats(sec.DISKSTAT2 || []);
  const diskIO = [];
  for (const dev of Object.keys(disk2)) {
    const a = disk1[dev];
    const b = disk2[dev];
    if (!a) continue;
    const reads = b.reads - a.reads;
    const writes = b.writes - a.writes;
    diskIO.push({
      dev,
      readBps: dt > 0 ? Math.max(0, b.sectorsRead - a.sectorsRead) * 512 / dt : 0,
      writeBps: dt > 0 ? Math.max(0, b.sectorsWritten - a.sectorsWritten) * 512 / dt : 0,
      readIops: dt > 0 ? Math.max(0, b.reads - a.reads) / dt : 0,
      writeIops: dt > 0 ? Math.max(0, b.writes - a.writes) / dt : 0,
      readLatencyMs: reads > 0 ? (b.readMs - a.readMs) / reads : null,
      writeLatencyMs: writes > 0 ? (b.writeMs - a.writeMs) / writes : null,
      inFlight: b.inFlight,
      utilPct: dt > 0 ? Math.min(100, Math.max(0, (b.ioTicks - a.ioTicks) / (dt * 10))) : 0,
    });
  }
  diskIO.sort((a, b) => b.readBps + b.writeBps - (a.readBps + a.writeBps));

  const snmp0 = parseSnmpTcp(sec.SNMP1 || []);
  const snmp1 = parseSnmpTcp(sec.SNMP2 || []);
  const sentSegments = snmp0 && snmp1 ? snmp1.outSegs - snmp0.outSegs : 0;
  const retransmits = snmp0 && snmp1 ? Math.max(0, snmp1.retransSegs - snmp0.retransSegs) : 0;
  const tcp = snmp0 && snmp1 ? {
    currEstab: snmp1.currEstab,
    inSegsPerSec: dt > 0 ? Math.max(0, snmp1.inSegs - snmp0.inSegs) / dt : 0,
    outSegsPerSec: dt > 0 ? Math.max(0, snmp1.outSegs - snmp0.outSegs) / dt : 0,
    retransPerSec: dt > 0 ? retransmits / dt : 0,
    retransPct: sentSegments + retransmits > 0 ? retransmits / (sentSegments + retransmits) * 100 : null,
  } : null;

  const pressure = Object.fromEntries(["cpu", "memory", "io"].map((resource) => {
    const line = firstLine(sec["PSI_" + resource]);
    const avg10 = /^some avg10=([\d.]+)/.exec(line);
    return [resource, avg10 ? Number(avg10[1]) : null];
  }));
  const load = (firstLine(sec.LOADAVG) || "").split(/\s+/).map((n) => Number(n) || 0);
  const inodes = parseInodes(sec.DFI || []);
  const disks = parseDf(sec.DF || []).map((d) => ({ ...d, inodePct: inodes[d.mount] }));

  return {
    hostname: firstLine(sec.HOST),
    os: firstLine(sec.OS).replace(/^"|"$/g, ""),
    kernel: firstLine(sec.KERNEL),
    uptimeSec: Number(firstLine(sec.UPTIME)) || 0,
    load1: load[0] || 0,
    load5: load[1] || 0,
    load15: load[2] || 0,
    nproc: Number(firstLine(sec.NPROC)) || 0,
    cpuPct,
    iowaitPct,
    systemPct,
    ctxtPerSec,
    intrPerSec,
    pressure,
    mem: {
      totalBytes: memTotal,
      usedBytes: memUsed,
      availBytes: memAvail,
      pct: memTotal > 0 ? (memUsed / memTotal) * 100 : 0,
      swapTotalBytes: swapTotal,
      swapUsedBytes: swapUsed,
      swapPct: swapTotal > 0 ? (swapUsed / swapTotal) * 100 : 0,
    },
    disks,
    nets,
    diskIO,
    tcp,
    tcpStates: parseTcpStates(sec.TCPSTATE || []),
    procStates: parseProcStates(sec.PROCSTATE || []),
    top: parseTop(sec.TOP || []),
    topMem: parseTop(sec.TOPMEM || []),
    gpu: parseGpu(sec.GPU || []),
    docker: parseDocker(sec.DOCKER || []),
    failedUnits: (sec.FAILED || []).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    services: parseServices(sec.SERVICES || []),
    prometheus: parsePromTargets(sec.PROM_TARGETS),
    users: Number(firstLine(sec.WHO)) || 0,
  };
}

function isLoopbackRequest(request) {
  const addr = request.socket && request.socket.remoteAddress;
  if (typeof addr !== "string") return false;
  const norm = addr.toLowerCase();
  const isLoop = norm === "::1" || norm.startsWith("::ffff:127.") || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(norm);
  if (!isLoop) return false;
  if (request.headers["cf-connecting-ip"] !== undefined || request.headers["x-forwarded-for"] !== undefined) return false;
  const host = request.headers.host;
  if (typeof host !== "string") return false;
  let hostUrl;
  try { hostUrl = new URL("http://" + host); } catch { return false; }
  const hn = hostUrl.hostname.toLowerCase();
  if (!(hn === "localhost" || hn === "[::1]" || hn === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hn))) return false;
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  try { return new URL(origin).host === hostUrl.host; } catch { return false; }
}

function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(text);
}

function makeRoutes(cfg) {
  // id -> { at, promise, lastGood?, pending, history: unknown[][] }
  const cache = new Map();

  const snapshotFor = (target) => {
    const now = Date.now();
    const entry = cache.get(target.id);
    if (entry && entry.pending) return entry.promise;
    if (entry && now - entry.at < cfg.intervalMs) return entry.promise;
    const previous = entry?.lastGood;
    const promise = collectSnapshot(target, cfg, previous).then((result) => {
      const cur = cache.get(target.id);
      if (!cur) return result;
      if (result.status === "online") {
        cur.lastGood = result;
        const d = result.data;
        const read = d.diskIO.reduce((sum, disk) => sum + disk.readBps, 0);
        const write = d.diskIO.reduce((sum, disk) => sum + disk.writeBps, 0);
        cur.history.push([
          Date.parse(result.sampledAt),
          d.cpuPct,
          d.mem.pct,
          d.load1,
          d.nets.reduce((sum, net) => sum + (net.loopback ? 0 : net.rxBps), 0),
          d.nets.reduce((sum, net) => sum + (net.loopback ? 0 : net.txBps), 0),
          read + write,
          d.cpuPct === null ? null : d.iowaitPct,
          d.mem.swapTotalBytes > 0 ? d.mem.swapPct : null,
          read,
          write,
          Object.fromEntries(d.services.map((service) => [service.name, service.status])),
        ]);
      } else {
        cur.history.push([Date.parse(result.sampledAt)]);
      }
      if (cur.history.length > 60) cur.history.shift();
      return result;
    });
    const record = { at: now, promise, lastGood: entry?.lastGood, pending: true, history: entry?.history || [] };
    cache.set(target.id, record);
    promise.then(
      () => { record.pending = false; },
      () => { record.pending = false; },
    );
    return promise;
  };

  const snapshotAll = async () => {
    const results = await Promise.all(cfg.targets.map((t) => snapshotFor(t)));
    return {
      targets: cfg.targets.map((t) => ({ id: t.id, label: t.label, host: t.host, user: t.user })),
      intervalMs: cfg.intervalMs,
      serverTime: new Date().toISOString(),
      historyKeys: ["t", "cpu", "mem", "load1", "rx", "tx", "disk", "iowait", "swap", "read", "write", "services"],
      snapshots: results.map((r) => ({ ...r, history: cache.get(r.id)?.history.slice() || [] })),
    };
  };

  const guard = (req, res) => {
    if (!isLoopbackRequest(req)) { writeJson(res, 403, { error: "forbidden: loopback-only" }); return false; }
    if (req.method !== "GET") { writeJson(res, 405, { error: `method not allowed: ${req.method}` }); return false; }
    return true;
  };

  return [
    {
      kind: "exact",
      path: "/api/server-monitor/snapshot",
      handler: async (req, res) => {
        if (!guard(req, res)) return;
        try {
          writeJson(res, 200, await snapshotAll());
        } catch (error) {
          writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
        }
      },
    },
    {
      kind: "exact",
      path: "/api/server-monitor/connection",
      handler: async (req, res) => {
        if (!guard(req, res)) return;
        const id = new URL(req.url, "http://localhost").searchParams.get("target");
        const target = cfg.targets.find((entry) => entry.id === id);
        if (!target) { writeJson(res, 404, { error: "Unknown target" }); return; }

        const startedAt = Date.now();
        const result = await runSsh(target, cfg, "bash -s", REQUIRE_LINUX).then(
          () => ({ ok: true }),
          (error) => ({ ok: false, reason: sshFailure(error), error: error.message }),
        );
        writeJson(res, 200, { ...result, latencyMs: Date.now() - startedAt });
      },
    },
    {
      kind: "exact",
      path: "/api/server-monitor/health",
      handler: (req, res) => {
        if (!guard(req, res)) return;
        writeJson(res, 200, { ok: true, targets: cfg.targets.length, intervalMs: cfg.intervalMs });
      },
    },
  ];
}

function configUrl(value, field) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new TypeError(`${field} must be an HTTP(S) URL without credentials, a query, or a fragment`);
  }
  return url.href.replace(/\/+$/, "");
}

function resolveConfig({
  targets = [],
  intervalMs = 3000,
  connectTimeoutMs = 8000,
  sshPath = "/usr/bin/ssh",
} = {}) {
  if (!Array.isArray(targets)) throw new TypeError("server-monitor.targets must be a list");
  if (!Number.isInteger(intervalMs) || intervalMs < 1000) throw new TypeError("intervalMs must be an integer ≥ 1000");
  if (!Number.isInteger(connectTimeoutMs) || connectTimeoutMs < 2000) throw new TypeError("connectTimeoutMs must be an integer ≥ 2000");
  if (typeof sshPath !== "string" || !sshPath.trim()) throw new TypeError("sshPath must be a nonempty string");

  const seen = new Set();
  const configured = targets.map(({ id, label, host, port = 22, user, keyPath, services = {} }, i) => {
    const field = `targets[${i}]`;
    if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id) || seen.has(id)) {
      throw new TypeError(`${field}.id must be unique and use letters, digits, hyphens, or underscores`);
    }
    seen.add(id);
    if (typeof host !== "string" || !/^[a-zA-Z0-9:][a-zA-Z0-9.:%_-]*$/.test(host)) {
      throw new TypeError(`${field}.host must be an SSH hostname or IP address`);
    }
    if (typeof user !== "string" || !/^[^\s\x00-\x1f\x7f@]+$/.test(user)) {
      throw new TypeError(`${field}.user must be a valid SSH username`);
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError(`${field}.port must be between 1 and 65535`);
    if (label !== undefined && (typeof label !== "string" || !label.trim())) throw new TypeError(`${field}.label must be a nonempty string`);
    if (keyPath !== undefined && (typeof keyPath !== "string" || !keyPath.trim())) throw new TypeError(`${field}.keyPath must be a nonempty string`);
    if (!services || typeof services !== "object" || Array.isArray(services)) throw new TypeError(`${field}.services must be a mapping`);
    return {
      id, label: label ?? `${user}@${host}`, host, port, user,
      keyPath: keyPath === undefined ? undefined : expandHome(keyPath),
      services: Object.entries(services).map(([name, service]) => {
        const path = `${field}.services.${name}`;
        if (!SERVICE_NAMES.has(name)) throw new TypeError(`Unknown monitoring service: ${path}`);
        if (!service || typeof service.url !== "string" || (service.link !== undefined && typeof service.link !== "string")) {
          throw new TypeError(`${path} must specify a URL and may specify a browser link`);
        }
        return {
          name, url: configUrl(service.url, path + ".url"),
          link: service.link === undefined ? undefined : configUrl(service.link, path + ".link"),
        };
      }),
    };
  });
  return { targets: configured, intervalMs, connectTimeoutMs, sshPath };
}

export function apply(ctx, rawConfig) {
  const cfg = resolveConfig(rawConfig);
  const routes = makeRoutes(cfg);
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => { for (const dispose of disposers.splice(0)) dispose(); };
  }, "server-monitor: routes");
}
