import { homedir } from "node:os";
import { join } from "node:path";

export const SERVICE_NAMES = new Set(["grafana", "prometheus", "uptime-kuma", "node-exporter"]);

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

function connectionProblem({ host, user, port, keyPath, proxyJump }) {
  if (typeof host !== "string" || !/^[a-zA-Z0-9:][a-zA-Z0-9.:%_-]*$/.test(host)) return "host must be an SSH hostname or IP address";
  if (typeof user !== "string" || !/^[^\s\x00-\x1f\x7f@]+$/.test(user)) return "user must be a valid SSH username";
  if (!Number.isInteger(port) || port < 1 || port > 65535) return "port must be between 1 and 65535";
  if (keyPath !== undefined && (typeof keyPath !== "string" || !keyPath.trim())) return "keyPath must be a nonempty string";
  if (proxyJump && !/^[a-zA-Z0-9\[][a-zA-Z0-9_.@:%\[\],-]*$/.test(proxyJump)) return "proxyJump must use OpenSSH [user@]host[:port] syntax";
  if (proxyJump && !/^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/.test(user)) return "user contains characters unsupported with ProxyJump";
}

export function resolveConfig({
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
  const configured = targets.map(({ id, label, host, port, user, keyPath, remoteSshProfile, services = {} }, i) => {
    const field = `targets[${i}]`;
    if (typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id) || seen.has(id)) {
      throw new TypeError(`${field}.id must be unique and use letters, digits, hyphens, or underscores`);
    }
    seen.add(id);
    if (label !== undefined && (typeof label !== "string" || !label.trim())) throw new TypeError(`${field}.label must be a nonempty string`);
    if (!services || typeof services !== "object" || Array.isArray(services)) throw new TypeError(`${field}.services must be a mapping`);
    let connection;
    if (remoteSshProfile !== undefined) {
      if (typeof remoteSshProfile !== "string" || !remoteSshProfile.trim()) throw new TypeError(`${field}.remoteSshProfile must be a name or ID`);
      if ([host, port, user, keyPath].some((value) => value !== undefined)) throw new TypeError(`${field} must use either remoteSshProfile or host/user connection fields`);
      connection = { remoteSshProfile, label, host: remoteSshProfile };
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
        return {
          name, url: configUrl(service.url, path + ".url"),
          link: service.link === undefined ? undefined : configUrl(service.link, path + ".link"),
        };
      }),
    };
  });
  return { targets: configured, intervalMs, connectTimeoutMs, sshPath };
}


// Each returned target keeps its identity while its connection fields stay the same.
// The sampler uses that identity to keep history tied to the host it actually measured.
export function resolveTargets(targets, settings) {
  if (!targets.some((target) => target.remoteSshProfile !== undefined)) return () => targets;

  let revision;
  let resolved;
  return () => {
    const document = settings.describe({ redactSecrets: true }).find((entry) => entry.ns === "remote-ssh");
    if (resolved && revision === document?.revision) return resolved;
    revision = document?.revision;
    const profiles = document?.value?.profiles ?? [];
    resolved = targets.map((target, index) => {
      const reference = target.remoteSshProfile;
      if (reference === undefined) return target;

      const byId = profiles.find((profile) => profile.id === reference);
      const matches = byId ? [byId] : profiles.filter((profile) => profile.name === reference);
      const profile = matches[0];
      let next = { ...target, source: "remote-ssh", label: target.label ?? profile?.name ?? reference };
      if (matches.length === 0) {
        next.issue = "remote-missing";
      } else if (matches.length > 1) {
        next = { ...next, label: target.label ?? reference, issue: "remote-ambiguous" };
      } else if (profile.authMethod !== "key") {
        next.issue = "remote-auth";
      } else {
        const { host, user, port, proxyJump } = profile;
        const keyPath = profile.keyPath === "" ? undefined : profile.keyPath;
        const connection = { host, user, port, keyPath, proxyJump };
        if (connectionProblem(connection)) {
          next.issue = "remote-invalid";
        } else {
          if (keyPath !== undefined) connection.keyPath = expandHome(keyPath);
          next = { ...next, ...connection };
        }
      }

      const previous = resolved?.[index];
      return previous && Object.keys(next).every((key) => previous[key] === next[key]) &&
        Object.keys(previous).length === Object.keys(next).length ? previous : next;
    });
    return resolved;
  };
}
