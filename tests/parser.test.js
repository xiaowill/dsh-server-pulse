import assert from "node:assert/strict";
import test from "node:test";
import { buildSnapshot, parseSections } from "../host/collector.js";
import { readServiceDetails } from "../host/services.js";
import { resolveConfig } from "../host/targets.js";

test("parseSections splits @@MARKER sections and ignores pre-marker lines", () => {
  const sec = parseSections("garbage\n@@HOST\nmyhost\n@@CPU1\ncpu 1 2 3\n");
  assert.deepEqual(sec.HOST, ["myhost"]);
  assert.equal(sec.CPU1[0], "cpu 1 2 3");
  assert.equal(sec.garbage, undefined);
});

test("buildSnapshot computes CPU/iowait with node_exporter convention", () => {
  // fields: user nice system idle iowait irq softirq steal
  const a = "cpu 100 0 50 800 50 0 0 0"; // total=1000, idle=800, iowait=50
  const b = "cpu 110 0 55 900 55 0 0 0"; // total=1120, idle=900, iowait=55
  const sec = parseSections(
    "@@T0\n1000.0\n@@CPU1\n" + a + "\n@@T1\n1001.0\n@@CPU2\n" + b + "\n"
  );
  const snap = buildSnapshot(sec);
  // dTotal=120, dIdle=100 => cpu = (1 - 100/120)*100 = 16.67%
  assert.ok(Math.abs(snap.cpuPct - 16.6667) < 0.01, "cpuPct ~16.67%, not inverted");
  // dIowait=5 => iowait = 5/120*100 = 4.17%
  assert.ok(Math.abs(snap.iowaitPct - 4.1667) < 0.01, "iowaitPct ~4.17% from field 4");
  // dSystem=5 => 5/120*100 = 4.17%
  assert.ok(Math.abs(snap.systemPct - 4.1667) < 0.01);
});

test("buildSnapshot tolerates malformed service JSON without throwing", () => {
  const sec = parseSections(
    "@@GRAFANA\nmalformed-json{{{\n@@PROM_TARGETS\n{\"status\":\"success\",\"data\":{\"activeTargets\":[]}}\n"
  );
  const snap = buildSnapshot(sec);
  assert.equal(snap.services.grafana?.version, undefined, "bad grafana JSON yields no version");
  assert.ok(snap.prometheus, "valid Prometheus JSON still parsed");
});

test("parseDocker normalizes SI and MiB memory units", () => {
  const sec = parseSections(
    "@@DOCKER\nweb | 12.5% | 512MiB / 2GiB\ndb | 5% | 1.5GB / 4GB\n"
  );
  const snap = buildSnapshot(sec);
  assert.equal(snap.docker.length, 2);
  assert.equal(snap.docker[0].memUsedMiB, 512);
  assert.equal(snap.docker[0].memTotalMiB, 2048);
  assert.ok(Math.abs(snap.docker[1].memUsedMiB - 1430.5) < 1, "1.5GB -> ~1430 MiB");
  assert.ok(Math.abs(snap.docker[1].memTotalMiB - 3814.7) < 1, "4GB -> ~3815 MiB");
});

test("readServiceDetails returns null objects for malformed nested data", () => {
  const details = readServiceDetails({
    PROM_TARGETS: ['{"status":"success","data":{"activeTargets":"not-an-array"}}'],
    KUMA_PAGE: ['{"publicGroupList":"wrong-type"}'],
  });
  assert.equal(details.prometheus, null);
  assert.equal(details.kuma, null);
});

test("resolveConfig defaults to 5s interval and PATH ssh", () => {
  const cfg = resolveConfig({ targets: [{ id: "t", host: "h", user: "u" }] });
  assert.equal(cfg.intervalMs, 5000);
  assert.equal(cfg.sshPath, "ssh");
});

test("resolveConfig rejects non-list targets", () => {
  assert.throws(() => resolveConfig({ targets: "nope" }), /server-pulse\.targets/);
});
