export const SERVICE_NAMES = new Set(["grafana", "prometheus", "uptime-kuma", "node-exporter"]);

export const SERVICE_SCRIPT = String.raw`
probe_http() {
  response=$(curl -q --globoff -sS -m 1 -w '%{http_code} %{time_total}' -o /dev/null -- "$1" 2>/dev/null) &&
    read -r code elapsed <<< "$response"
}
probe_json() {
  response=$(curl -q --globoff -fs -m 1 --max-filesize 8388608 -w '\n%{http_code} %{time_total} %{content_type}' -- "$1" 2>/dev/null) &&
    read -r code elapsed media <<< "$(tail -n 1 <<< "$response")" &&
    [[ $code == 200 && $media == application/json* ]]
}
emit_json() {
  printf '@@%s\n' "$1"
  sed '$d' <<< "$response"
}
collect_service() {
  local name=$1 configured=$2 slug=$3 url port response code elapsed media path
  local -a ports urls
  case "$name" in
    grafana) ports=(3000 19095); path=api/health ;;
    prometheus) ports=(9090 19093); path=-/ready ;;
    uptime-kuma) ports=(3001); path=api/entry-page ;;
    node-exporter) ports=(9100); path=metrics ;;
  esac
  if [[ -n $configured ]]; then
    urls=("$configured")
  else
    for port in "${"$"}{ports[@]}"; do urls+=("http://127.0.0.1:$port"); done
  fi

  for url in "${"$"}{urls[@]}"; do
    case "$name" in
      grafana|uptime-kuma) probe_json "$url/$path" || continue ;;
      *) probe_http "$url/$path" && [[ $code == 200 ]] || continue ;;
    esac
    printf '@@SERVICE_%s\nup %s %s\n' "$name" "$url" "$elapsed"
    case "$name" in
      grafana) emit_json GRAFANA ;;
      prometheus)
        if probe_json "$url/api/v1/targets?state=active"; then emit_json PROM_TARGETS; fi
        if probe_json "$url/api/v1/status/buildinfo"; then emit_json PROM_BUILD; fi
        ;;
      uptime-kuma)
        if probe_json "$url/api/status-page/$slug"; then
          emit_json KUMA_PAGE
          if probe_json "$url/api/status-page/heartbeat/$slug"; then emit_json KUMA_HEARTBEATS; fi
        fi
        ;;
    esac
    return
  done
  if [[ -n $configured ]]; then printf '@@SERVICE_%s\ndown %s\n' "$name" "$configured"; fi
}
if command -v curl >/dev/null 2>&1; then
  exec 3< <(collect_service "$1" "$2" "$3")
  shift 3
  exec 4< <(collect_service "$1" "$2" "$3")
  shift 3
  exec 5< <(collect_service "$1" "$2" "$3")
  shift 3
  exec 6< <(collect_service "$1" "$2" "$3")
  cat <&3
  cat <&4
  cat <&5
  cat <&6
  exec 3<&- 4<&- 5<&- 6<&-
fi
`;

export function readServiceDetails(sections) {
  const parse = (key) => {
    const data = sections[key]?.join("\n").trim();
    return data ? JSON.parse(data) : null;
  };
  const grafana = parse("GRAFANA");
  const build = parse("PROM_BUILD");
  const targets = parse("PROM_TARGETS");
  const page = parse("KUMA_PAGE");
  const heartbeat = parse("KUMA_HEARTBEATS");

  return {
    services: Object.fromEntries([...SERVICE_NAMES].flatMap((name) => {
      const line = sections["SERVICE_" + name]?.[0];
      if (!line) return [];
      const [status, url, elapsed] = line.split(" ");
      return [[name, {
        status, url, latencyMs: status === "up" ? Number(elapsed) * 1000 : null,
        ...(name === "grafana" && grafana ? { version: grafana.version, database: grafana.database } : {}),
        ...(name === "prometheus" && build?.status === "success" ? { version: build.data.version } : {}),
      }]];
    })),
    prometheus: targets?.status === "success" ? parsePromTargets(targets.data.activeTargets) : null,
    kuma: page?.publicGroupList ? {
      title: page.config?.title,
      monitors: page.publicGroupList.flatMap((group) => group.monitorList.map((monitor) => ({
        id: monitor.id, name: monitor.name, group: group.name,
        status: heartbeat?.heartbeatList?.[monitor.id]?.at(-1)?.status,
        ping: heartbeat?.heartbeatList?.[monitor.id]?.at(-1)?.ping,
        uptime: heartbeat?.uptimeList?.[monitor.id + "_24"],
      }))),
    } : null,
  };
}

function parsePromTargets(activeTargets) {
  const targets = activeTargets.map((target) => ({
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
