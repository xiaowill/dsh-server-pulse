import { collectSnapshot } from "./host/collector.js";
import { REQUIRE_LINUX, runSsh, sshFailure } from "./host/ssh.js";
import { resolveConfig } from "./host/targets.js";
import { listSshAliases } from "./host/ssh-config.js";

export { buildSnapshot, collectSnapshot, parseSections } from "./host/collector.js";

export const name = "server-pulse";
export const inject = ["webServer"];

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
  const { targets } = cfg;
  const cache = new WeakMap();

  const snapshotFor = (target) => {
    const now = Date.now();
    const entry = cache.get(target);
    if (entry && entry.pending) return entry.promise;
    if (entry && now - entry.at < cfg.intervalMs) return entry.promise;
    const previous = entry?.lastGood;
    const promise = collectSnapshot(target, cfg, previous).then((result) => {
      const cur = cache.get(target);
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
    cache.set(target, record);
    promise.then(
      () => { record.pending = false; },
      () => { record.pending = false; },
    );
    return promise;
  };

  const snapshotAll = async () => {
    const results = await Promise.all(targets.map(snapshotFor));
    return {
      targets: targets.map((t) => ({ id: t.id, label: t.label, host: t.host, user: t.user, source: t.source })),
      intervalMs: cfg.intervalMs,
      serverTime: new Date().toISOString(),
      historyKeys: ["t", "cpu", "mem", "load1", "rx", "tx", "disk", "iowait", "swap", "read", "write", "services"],
      snapshots: results.map((result, i) => ({ ...result, history: cache.get(targets[i])?.history.slice() ?? [] })),
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
      path: "/api/server-pulse/snapshot",
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
      path: "/api/server-pulse/connection",
      handler: async (req, res) => {
        if (!guard(req, res)) return;
        const id = new URL(req.url, "http://localhost").searchParams.get("target");
        const target = targets.find((entry) => entry.id === id);
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
      path: "/api/server-pulse/ssh-hosts",
      handler: (req, res) => {
        if (!guard(req, res)) return;
        try {
          writeJson(res, 200, {
            aliases: listSshAliases(),
            monitored: targets.filter((target) => target.sshHost).map((target) => target.sshHost),
          });
        } catch (error) {
          writeJson(res, 200, { aliases: [], monitored: [], error: error instanceof Error ? error.message : String(error) });
        }
      },
    },
    {
      kind: "exact",
      path: "/api/server-pulse/health",
      handler: (req, res) => {
        if (!guard(req, res)) return;
        writeJson(res, 200, { ok: true, targets: cfg.targets.length, intervalMs: cfg.intervalMs });
      },
    },
  ];
}

export function apply(ctx, rawConfig) {
  const cfg = resolveConfig(rawConfig);
  const routes = makeRoutes(cfg);
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => { for (const dispose of disposers.splice(0)) dispose(); };
  }, "server-pulse: routes");
}
