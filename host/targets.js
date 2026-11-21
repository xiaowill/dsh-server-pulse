import { homedir } from "node:os";
import { join } from "node:path";

import { SSH_ALIAS } from "./ssh-config.js";
import { SERVICE_NAMES } from "./services.js";

function expandHome(p) {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function configUrl(value, field) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new TypeError(`${field} must be an HTTP(S) URL without credentials, a query, or a fragment`);
  }
  return url.href.replace(/\/+$/, "");
}

function connectionProblem({ host, user, port, keyPath }) {
  if (typeof host !== "string" || !/^[a-zA-Z0-9:][a-zA-Z0-9.:%_-]*$/.test(host)) return "host must be an SSH hostname or IP address";
  if (typeof user !== "string" || !/^[^\s\x00-\x1f\x7f@]+$/.test(user)) return "user must be a valid SSH username";
  if (!Number.isInteger(port) || port < 1 || port > 65535) return "port must be between 1 and 65535";
  if (keyPath !== undefined && (typeof keyPath !== "string" || !keyPath.trim())) return "keyPath must be a nonempty string";
}

export function resolveConfig({
  targets = [],
  intervalMs = 5000,
  connectTimeoutMs = 8000,
  sshPath = "ssh",
} = {}) {
  if (!Array.isArray(targets)) throw new TypeError("server-pulse.targets must be a list");
  if (!Number.isInteger(intervalMs) || intervalMs < 1000) throw new TypeError("intervalMs must be an integer ≥ 1000");
  if (!Number.isInteger(connectTimeoutMs) || connectTimeoutMs < 2000) throw new TypeError("connectTimeoutMs must be an integer ≥ 2000");
  if (typeof sshPath !== "string" || !sshPath.trim()) throw new TypeError("sshPath must be a nonempty string");

  const seen = new Set();
  const configured = targets.map(({ id, label, host, port, user, keyPath, sshHost, remoteSshProfile, services = {} }, i) => {
    const field = `targets[${i}]`;
    if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id) || seen.has(id)) {
      throw new TypeError(`${field}.id must be unique and use letters, digits, dots, hyphens, or underscores`);
    }
    seen.add(id);
    if (label !== undefined && (typeof label !== "string" || !label.trim())) throw new TypeError(`${field}.label must be a nonempty string`);
    if (!services || typeof services !== "object" || Array.isArray(services)) throw new TypeError(`${field}.services must be a mapping`);
    let connection;
    if (remoteSshProfile !== undefined) throw new TypeError(`${field}.remoteSshProfile was removed. Use sshHost to reference an OpenSSH Host alias.`);
    if (sshHost !== undefined) {
      if (typeof sshHost !== "string" || !SSH_ALIAS.test(sshHost)) throw new TypeError(`${field}.sshHost must be an OpenSSH Host alias`);
      if ([host, port, user, keyPath].some((value) => value !== undefined)) throw new TypeError(`${field} must use either sshHost or host/user connection fields`);
      connection = { sshHost, label: label ?? sshHost, host: sshHost, source: "openssh" };
    } else {
      connection = { host, port: port === undefined ? 22 : port, user, keyPath };
      const problem = connectionProblem(connection);
      if (problem) throw new TypeError(`${field}.${problem}`);
      if (keyPath !== undefined) connection.keyPath = expandHome(keyPath);
      connection.label = label ?? `${user}@${host}`;
    }
    return {
      id, ...connection,
      services: Object.entries(services).map(([name, service]) => {
        const path = `${field}.services.${name}`;
        if (!SERVICE_NAMES.has(name)) throw new TypeError(`Unknown monitoring service: ${path}`);
        if (!service || typeof service.url !== "string" || (service.link !== undefined && typeof service.link !== "string")) {
          throw new TypeError(`${path} must specify a URL and may specify a browser link`);
        }
        if (service.statusPage !== undefined && (name !== "uptime-kuma" || typeof service.statusPage !== "string" || !/^[a-zA-Z0-9_-]+$/.test(service.statusPage))) {
          throw new TypeError(`${path}.statusPage must be a Kuma status page slug`);
        }
        return {
          name, statusPage: service.statusPage, url: configUrl(service.url, path + ".url"),
          link: service.link === undefined ? undefined : configUrl(service.link, path + ".link"),
        };
      }),
    };
  });
  return { targets: configured, intervalMs, connectTimeoutMs, sshPath };
}
