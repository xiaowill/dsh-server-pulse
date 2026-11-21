import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "client.js"), "utf8");

function dictBody(name) {
  const marker = `const ${name} = {`;
  const start = src.indexOf(marker);
  assert.ok(start >= 0, `${name} dictionary exists`);
  let i = start + marker.length - 1; // at '{'
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start + marker.length - 1, i);
}
function dictKeys(name) {
  const keys = [];
  const re = /"([a-zA-Z0-9._-]+)"\s*:/g;
  let m;
  while ((m = re.exec(dictBody(name)))) keys.push(m[1]);
  return keys;
}

test("client registers as a module with the expected inject list", () => {
  let captured = null;
  global.window = { __ModuleLoader__: { load: (m) => { captured = m; } } };
  (0, eval)(src);
  assert.ok(captured, "module was passed to __ModuleLoader__.load");
  assert.equal(captured.id, "dsh-server-pulse");
  assert.deepEqual(
    captured.factory(() => ({})).inject,
    ["slots", "locale", "layout"],
  );
});

test("client mounts both the sidebar and main slots", () => {
  let factory = null;
  global.window = { __ModuleLoader__: { load: (m) => { factory = m.factory; } } };
  (0, eval)(src);
  const React = {
    createElement: () => ({}),
    Fragment: Symbol("Fragment"),
    useState: (v) => [v, () => {}],
    useEffect: () => {},
  };
  const mod = factory((name) => {
    if (name === "react") return React;
    throw new Error("unexpected require " + name);
  });
  const injectNames = [];
  const registered = [];
  const ctx = {
    effect(fn) { fn(); return () => {}; },
    locale: { register: () => () => {}, bind: () => (k) => k },
    slots: {
      inject(name, fn) { injectNames.push(name); fn(); return () => {}; },
      register(def, comp) { registered.push(def.name); return () => {}; },
    },
  };
  mod.apply(ctx);
  assert.ok(injectNames.includes("sidebar.panellist"), "sidebar slot injected");
  assert.ok(injectNames.includes("main"), "main slot injected");
  assert.ok(registered.includes("main"), "main slot registered");
});

test("zh and en dictionaries share the exact same key set", () => {
  assert.deepEqual([...dictKeys("zh")].sort(), [...dictKeys("en")].sort(), "zh/en keys are 1:1");
});

test("every static tt(\"key\") reference exists in the dictionaries", () => {
  const dict = new Set([...dictKeys("zh"), ...dictKeys("en")]);
  const keys = new Set();
  const re = /tt\("([a-zA-Z0-9._-]+)"/g;
  let m;
  while ((m = re.exec(src))) {
    if (!m[1].endsWith(".")) keys.add(m[1]); // skip dynamic prefixes like "ssh." + reason
  }
  const missing = [...keys].filter((k) => !dict.has(k));
  assert.deepEqual(missing, [], "no orphan tt() keys: " + missing.join(", "));
});
