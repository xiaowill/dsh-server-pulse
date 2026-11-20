import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { apply } from "../index.js";
import { buildSnapshot, parseSections } from "../host/collector.js";
import { resolveConfig, resolveTargets } from "../host/targets.js";

const link = { id: "node", remoteSshProfile: "Primary" };
const keyProfile = {
  id: "primary-id", name: "Primary", host: "node.example.com", port: 2222,
  user: "operator", authMethod: "key", keyPath: "", proxyJump: "jump.example.com",
};
const document = (revision, profiles) => ({ ns: "remote-ssh", revision, value: { profiles } });

test("empty and direct configuration do not read Remote SSH settings", () => {
  const settings = { describe: () => assert.fail("unnecessary settings access") };
  assert.deepEqual(resolveTargets(resolveConfig().targets, settings)(), []);
  const direct = resolveConfig({ targets: [{ id: "node", host: "node.example.com", user: "operator" }] }).targets;
  assert.equal(resolveTargets(direct, settings)(), direct);
  assert.equal(direct[0].port, 22);
  assert.throws(() => resolveConfig({ targets: [{ ...link, host: "node.example.com" }] }), /either remoteSshProfile/);
  assert.throws(() => resolveConfig({ targets: [link, link] }), /unique/);
});

test("reads redacted settings by name or ID and retains unchanged target identity", () => {
  const targets = resolveConfig({
    targets: [link, { id: "by-id", remoteSshProfile: keyProfile.id }],
  }).targets;
  let descriptors = [document(1, [keyProfile, { ...keyProfile, id: "other", name: keyProfile.id }])];
  const settings = { describe(options) {
    assert.deepEqual(options, { redactSecrets: true });
    return descriptors;
  } };
  const targetsNow = resolveTargets(targets, settings);
  const [first, byId] = targetsNow();
  assert.equal(first.host, "node.example.com");
  assert.equal(first.proxyJump, "jump.example.com");
  assert.equal(first.keyPath, undefined);
  assert.equal(byId.host, first.host);
  descriptors = [document(2, [keyProfile])];
  assert.equal(targetsNow()[0], first);
  descriptors = [document(3, [{ ...keyProfile, host: "other.example.com" }])];
  assert.notEqual(targetsNow()[0], first);
  assert.equal(targetsNow()[0].host, "other.example.com");
});

test("rejects missing, ambiguous, password, and invalid imported connections", () => {
  let descriptors = [];
  const targetsNow = resolveTargets(resolveConfig({ targets: [link] }).targets, {
    describe: () => descriptors,
  });
  assert.equal(targetsNow()[0].issue, "remote-missing");
  descriptors = [document(1, [keyProfile, { ...keyProfile, id: "duplicate" }])];
  assert.equal(targetsNow()[0].issue, "remote-ambiguous");
  descriptors = [document(2, [{ ...keyProfile, authMethod: "password" }])];
  assert.equal(targetsNow()[0].issue, "remote-auth");
  descriptors = [document(3, [{ ...keyProfile, port: 0 }])];
  assert.equal(targetsNow()[0].issue, "remote-invalid");
  descriptors = [];
  assert.equal(targetsNow()[0].issue, "remote-missing");
});

test("HTTP sampling stays local and does not reuse history after a saved host changes", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "dsh-monitor-test-"));
  t.after(() => rm(dir, { recursive: true }));
  const sshPath = join(dir, "fixture-ssh");
  const argsFile = join(dir, "args");
  await writeFile(sshPath, `#!/bin/sh
printf '%s\\n' "$@" > "${argsFile}"
cat >/dev/null
printf '@@T0\\n1\\n@@T1\\n2\\n@@MEMINFO\\nMemTotal: 1000 kB\\nMemAvailable: 600 kB\\n@@END\\n'
`, { mode: 0o700 });
  let descriptors = [document(1, [keyProfile])];
  const routes = new Map();
  apply({
    settings: { describe: () => descriptors },
    effect(register) { register(); },
    webServer: { register(route) { routes.set(route.path, route.handler); } },
  }, { targets: [link], sshPath });

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

  const url = "/api/server-monitor/snapshot";
  assert.equal((await call(url, { headers: { host: "localhost", "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await call(url, { method: "POST" })).status, 405);
  assert.equal((await call("/api/server-monitor/connection?target=unknown")).status, 404);
  const first = (await call(url)).data.snapshots[0];
  assert.equal(first.source, "remote-ssh");
  assert.equal(first.status, "online");
  assert.equal(first.history.length, 1);
  assert.match(await readFile(argsFile, "utf8"), /StrictHostKeyChecking=yes\n[\s\S]*-J\njump\.example\.com\n-p\n2222\n/);

  descriptors = [document(2, [{ ...keyProfile, host: "other.example.com" }])];
  const changed = (await call(url)).data.snapshots[0];
  assert.equal(changed.host, "other.example.com");
  assert.equal(changed.history.length, 1);
  assert.match(await readFile(argsFile, "utf8"), /other\.example\.com/);

  descriptors = [document(3, [{ ...keyProfile, authMethod: "password" }])];
  const rejected = (await call(url)).data.snapshots[0];
  assert.equal(rejected.reason, "remote-auth");
  assert.deepEqual(rejected.history, []);
  assert.deepEqual((await call("/api/server-monitor/connection?target=node")).data, { ok: false, reason: "remote-auth" });
  assert.match(await readFile(argsFile, "utf8"), /other\.example\.com/);
});

test("collector reads PSI, process identifiers, and scrape counts", () => {
  const snapshot = buildSnapshot(parseSections(`@@PSI_cpu
some avg10=8.30 avg60=0.10 avg300=0.01 total=10
@@TOP
 152  3.2  0.9 example process
@@SERVICES
prometheus up 0.047
@@PROM_TARGETS
{"status":"success","data":{"activeTargets":[{"labels":{"job":"linux","instance":"node.example.com"},"health":"up","lastScrapeDuration":0.02}]}}
@@END
`));
  assert.equal(snapshot.pressure.cpu, 8.3);
  assert.equal(snapshot.pressure.io, null);
  assert.deepEqual(snapshot.top[0], { pid: 152, cpu: 3.2, mem: 0.9, name: "example process" });
  assert.deepEqual(snapshot.services.prometheus, { status: "up", latencyMs: 47 });
  assert.equal(snapshot.prometheus.up, 1);
});
