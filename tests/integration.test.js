import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { apply } from "../index.js";
import { buildSnapshot, parseSections } from "../host/collector.js";
import { SERVICE_SCRIPT, readServiceDetails } from "../host/services.js";
import { listSshAliases } from "../host/ssh-config.js";
import { resolveConfig } from "../host/targets.js";

test("discovers concrete Host aliases through Include without reading key material", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "dsh-monitor-"));
  t.after(() => rm(dir, { recursive: true }));
  await mkdir(join(dir, "config.d"));
  await writeFile(join(dir, "config"),
    'Host app prod.* !hidden.example # hidden text\n IdentityFile ~/.ssh/secret-id\nInclude config.d/*.conf\n');
  await writeFile(join(dir, "config.d", "linux.conf"),
    'Host "build-02" app # extra\n Include config\nHost = cache.example\n');
  assert.deepEqual(listSshAliases(join(dir, "config")), ["app", "build-02", "cache.example"]);
  assert.deepEqual(listSshAliases(join(dir, "missing")), []);
});

test("configuration accepts alias and manual forms and validates explicit service inputs", () => {
  assert.deepEqual(resolveConfig().targets, []);
  const [alias, manual] = resolveConfig({ targets: [
    { id: "app-1", sshHost: "linux.prod" },
    { id: "other", host: "other.example.com", user: "operator", services: {
      "uptime-kuma": { url: "https://kuma.example.com/kuma/", statusPage: "nodes" },
    } },
  ] }).targets;
  assert.equal(alias.host, "linux.prod");
  assert.equal(alias.source, "openssh");
  assert.equal(manual.port, 22);
  assert.equal(manual.services[0].url, "https://kuma.example.com/kuma");
  assert.throws(() => resolveConfig({ targets: [{ id: "x", sshHost: "-wild" }] }), /Host alias/);
  assert.throws(() => resolveConfig({ targets: [{ id: "x", sshHost: "x", user: "explicit" }] }), /either sshHost/);
  assert.throws(() => resolveConfig({ targets: [{ id: "x", remoteSshProfile: "old" }] }), /was removed/);
  assert.throws(() => resolveConfig({ targets: [{ id: "x", sshHost: "x", services: {
    "uptime-kuma": { url: "http://localhost", statusPage: "../admin" },
  } }] }), /page slug/);
});

test("alias sampling leaves user, port and key selection to OpenSSH; HTTP stays local", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "dsh-monitor-"));
  t.after(() => rm(dir, { recursive: true }));
  const sshPath = join(dir, "fixture-ssh");
  const argsFile = join(dir, "args");
  await writeFile(sshPath, `#!/bin/sh
printf '%s\\n' "$@" > "${argsFile}"
cat >/dev/null
printf '@@T0\\n1\\n@@T1\\n2\\n@@MEMINFO\\nMemTotal: 1000 kB\\nMemAvailable: 600 kB\\n@@END\\n'
`, { mode: 0o700 });
  const routes = new Map();
  apply({
    effect(register) { register(); },
    webServer: { register(route) { routes.set(route.path, route.handler); } },
  }, { targets: [{ id: "node", sshHost: "node.example.com" }], sshPath });

  const call = async (url, request = {}) => {
    const pathname = new URL(url, "http://localhost").pathname;
    let result;
    await routes.get(pathname)({
      url, method: "GET", headers: { host: "localhost" },
      socket: { remoteAddress: "127.0.0.1" }, ...request,
    }, {
      setHeader() {},
      end(body) { result = { status: this.statusCode, data: JSON.parse(body) }; },
    });
    return result;
  };

  const snapshot = "/api/server-pulse/snapshot";
  assert.equal((await call("/api/server-pulse/ssh-hosts", { headers: { host: "localhost", "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await call(snapshot, { method: "POST" })).status, 405);
  assert.equal((await call("/api/server-pulse/connection?target=unknown")).status, 404);
  const sample = (await call(snapshot)).data.snapshots[0];
  assert.equal(sample.source, "openssh");
  assert.equal(sample.status, "online");
  assert.equal(sample.history.length, 1);
  const args = (await readFile(argsFile, "utf8")).trim().split("\n");
  assert.ok(args.includes("StrictHostKeyChecking=yes"));
  assert.notEqual(args.indexOf("--"), -1);
  assert.equal(args[args.indexOf("--") + 1], "node.example.com");
  for (const flag of ["-i", "-l", "-p", "-J"]) assert.ok(!args.includes(flag));
});

test("service script reads Grafana, Prometheus and Kuma detail endpoints", async (t) => {
  const paths = [];
  const fixture = createServer((req, res) => {
    paths.push(req.url);
    const data = {
      "/grafana/api/health": { database: "ok", version: "12.1.0" },
      "/prom/api/v1/status/buildinfo": { status: "success", data: { version: "3.5.0" } },
      "/prom/api/v1/targets?state=active": { status: "success", data: { activeTargets: [] } },
      "/kuma/api/entry-page": { type: "entryPage", entryPage: null },
      "/kuma/api/status-page/infra": { config: { title: "Infrastructure" }, publicGroupList: [
        { name: "Web", monitorList: [{ id: 7, name: "API" }] },
      ] },
      "/kuma/api/status-page/heartbeat/infra": { heartbeatList: { 7: [{ status: 0 }, { status: 1, ping: 42 }] }, uptimeList: { "7_24": 0.997 } },
    };
    if (req.url === "/prom/-/ready") return res.end("ready");
    if (!Object.hasOwn(data, req.url)) { res.statusCode = 404; return res.end(); }
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data[req.url]));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => new Promise((done) => fixture.close(done)));
  const base = "http://127.0.0.1:" + fixture.address().port;
  const bash = spawn("bash", ["-s", "--",
    "grafana", base + "/grafana", "default",
    "prometheus", base + "/prom", "default",
    "uptime-kuma", base + "/kuma", "infra",
    "node-exporter", base + "/missing", "default",
  ]);
  let stdout = "";
  let stderr = "";
  bash.stdout.on("data", (chunk) => { stdout += chunk; });
  bash.stderr.on("data", (chunk) => { stderr += chunk; });
  bash.stdin.end(SERVICE_SCRIPT);
  const [code] = await once(bash, "close");
  assert.equal(code, 0, stderr);
  const data = readServiceDetails(parseSections(stdout));
  assert.equal(data.services.grafana.database, "ok");
  assert.equal(data.services.prometheus.version, "3.5.0");
  assert.deepEqual(data.prometheus.targets, []);
  assert.equal(data.services["node-exporter"].status, "down");
  assert.equal(data.kuma.title, "Infrastructure");
  assert.deepEqual(data.kuma.monitors, [{ id: 7, name: "API", group: "Web", status: 1, ping: 42, uptime: 0.997 }]);
  assert.equal(paths.length, 8);
});

test("Linux parsing retains PSI and process identifiers when no service is found", () => {
  const snapshot = buildSnapshot(parseSections(`@@PSI_cpu
some avg10=8.30 avg60=0.10 avg300=0.01 total=10
@@TOP
 152  3.2  0.9 example process
@@END
`));
  assert.equal(snapshot.pressure.cpu, 8.3);
  assert.equal(snapshot.pressure.io, null);
  assert.deepEqual(snapshot.top[0], { pid: 152, cpu: 3.2, mem: 0.9, name: "example process" });
  assert.deepEqual(snapshot.services, {});
  assert.equal(snapshot.kuma, null);
});
