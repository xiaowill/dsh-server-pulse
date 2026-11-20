import { spawn } from "node:child_process";

export const REQUIRE_LINUX = 'if ! [[ -r /proc/stat && -r /proc/meminfo ]]; then echo DSH_REQUIRES_LINUX >&2; exit 1; fi\n';

export function runSsh(target, cfg, command, script) {
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
      ...(target.proxyJump ? ["-J", target.proxyJump] : []),
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

export function sshFailure(error) {
  const message = error.message;
  if (/host key verification failed|host identification has changed|host key is known/i.test(message)) return "host-key";
  if (/permission denied|no such identity|load key|authentication failed|no mutual signature/i.test(message)) return "auth";
  if (/timed out|connection refused|connection reset|no route to host|network is unreachable|could not resolve|connection closed/i.test(message)) return "network";
  if (/DSH_REQUIRES_LINUX/.test(message)) return "linux";
  return "other";
}
