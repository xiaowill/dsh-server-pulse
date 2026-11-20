import { existsSync, globSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const SSH_ALIAS = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

export function listSshAliases(file = join(homedir(), ".ssh", "config")) {
  if (!existsSync(file)) return [];
  const root = dirname(file);
  const visited = new Set();
  const aliases = new Set();

  const scan = (path) => {
    const canonical = realpathSync(path);
    if (visited.has(canonical)) return;
    visited.add(canonical);
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const directive = /^\s*(host|include)(?:\s*=\s*|\s+)(.*)$/i.exec(line);
      if (!directive) continue;
      const [, key, rules] = directive;
      const values = (rules.match(/"[^"]*"|#[^\r\n]*|[^\s#]+/g) ?? [])
        .filter((value) => !value.startsWith("#")).map((value) => value.replace(/^"|"$/g, ""));
      if (key.toLowerCase() === "host") {
        for (const value of values) if (SSH_ALIAS.test(value)) aliases.add(value);
      } else {
        for (const value of values) {
          const pattern = value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
          for (const included of globSync(pattern, { cwd: root }).sort()) scan(included.startsWith("/") ? included : join(root, included));
        }
      }
    }
  };

  scan(file);
  return [...aliases].sort();
}
