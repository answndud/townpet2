import "dotenv/config"
import { execFile } from "child_process"
import { mkdirSync, writeFileSync } from "fs"
import { dirname } from "path"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

type HttpMethod = "GET" | "POST"

type EndpointConfig = {
  label: string
  method: HttpMethod
  path: string
  body?: string
  samples: number
  pauseMs: number
}

type SampleRecord = {
  label: string
  index: number
  method: HttpMethod
  status: number
  dnsMs: number
  connectMs: number
  tlsMs: number
  ttfbMs: number
  totalMs: number
  vercelCache: string
  vercelId: string
}

type GroupSummary = {
  count: number
  statusCounts: Map<number, number>
  ttfbValues: number[]
  totalValues: number[]
  connectValues: number[]
  tlsValues: number[]
}

const METRICS_PREFIX = "CURLMETRICS"

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "")
}

function toPositiveInt(name: string, raw: string | undefined, fallback: number) {
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`${name} must be a positive integer. received=${raw}`)
  }

  return parsed
}

function toNonNegativeInt(name: string, raw: string | undefined, fallback: number) {
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`${name} must be a non-negative integer. received=${raw}`)
  }

  return parsed
}

function getHeaderValue(lines: string[], headerName: string) {
  const prefix = `${headerName.toLowerCase()}:`
  let found = ""
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.toLowerCase().startsWith(prefix)) {
      found = line.slice(prefix.length).trim()
    }
  }
  return found
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function runCurl(endpointUrl: string, method: HttpMethod, body?: string) {
  const args = [
    "-sS",
    "-D",
    "-",
    "-o",
    "/dev/null",
    "-w",
    `${METRICS_PREFIX}\t%{http_code}\t%{time_namelookup}\t%{time_connect}\t%{time_appconnect}\t%{time_starttransfer}\t%{time_total}`,
  ]

  if (method === "POST") {
    args.push("-X", "POST", "-H", "content-type: application/json")
    if (body) {
      args.push("-d", body)
    }
  }

  args.push(endpointUrl)

  const { stdout } = await execFileAsync("curl", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  })

  const lines = stdout.replace(/\r/g, "").split("\n").filter((line) => line.length > 0)
  const metricsLine = [...lines].reverse().find((line) => line.startsWith(`${METRICS_PREFIX}\t`))
  if (!metricsLine) {
    throw new Error(`curl metrics line not found for ${endpointUrl}`)
  }

  const metrics = metricsLine.split("\t")
  if (metrics.length < 7) {
    throw new Error(`invalid metrics payload: ${metricsLine}`)
  }

  const status = Number(metrics[1])
  const dns = Number(metrics[2]) * 1000
  const connect = Number(metrics[3]) * 1000
  const tls = Number(metrics[4]) * 1000
  const ttfb = Number(metrics[5]) * 1000
  const total = Number(metrics[6]) * 1000

  if (![status, dns, connect, tls, ttfb, total].every((value) => Number.isFinite(value))) {
    throw new Error(`invalid numeric metrics for ${endpointUrl}: ${metricsLine}`)
  }

  const headerLines = lines.filter((line) => !line.startsWith(`${METRICS_PREFIX}\t`))

  return {
    status,
    dnsMs: dns,
    connectMs: connect,
    tlsMs: tls,
    ttfbMs: ttfb,
    totalMs: total,
    vercelCache: getHeaderValue(headerLines, "x-vercel-cache"),
    vercelId: getHeaderValue(headerLines, "x-vercel-id"),
  }
}

function buildSummary(records: SampleRecord[]) {
  const grouped = new Map<string, GroupSummary>()

  for (const row of records) {
    const current =
      grouped.get(row.label) ??
      ({
        count: 0,
        statusCounts: new Map<number, number>(),
        ttfbValues: [],
        totalValues: [],
        connectValues: [],
        tlsValues: [],
      } satisfies GroupSummary)

    current.count += 1
    current.statusCounts.set(row.status, (current.statusCounts.get(row.status) ?? 0) + 1)
    current.ttfbValues.push(row.ttfbMs)
    current.totalValues.push(row.totalMs)
    current.connectValues.push(row.connectMs)
    current.tlsValues.push(row.tlsMs)

    grouped.set(row.label, current)
  }

  const lines: string[] = []
  lines.push(`# API Latency Snapshot`)
  lines.push(``)
  lines.push(`- generatedAt: ${new Date().toISOString()}`)
  lines.push(`- samples: ${records.length}`)
  lines.push(``)

  for (const [label, summary] of grouped.entries()) {
    const status = [...summary.statusCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([code, count]) => `${code}x${count}`)
      .join(", ")
    const slowCount = summary.totalValues.filter((value) => value > 500).length

    lines.push(`## ${label}`)
    lines.push(`- count: ${summary.count}`)
    lines.push(`- status: ${status}`)
    lines.push(
      `- total p50/p95(ms): ${percentile(summary.totalValues, 50).toFixed(1)} / ${percentile(summary.totalValues, 95).toFixed(1)}`,
    )
    lines.push(
      `- ttfb p50/p95(ms): ${percentile(summary.ttfbValues, 50).toFixed(1)} / ${percentile(summary.ttfbValues, 95).toFixed(1)}`,
    )
    lines.push(
      `- connect p50/p95(ms): ${percentile(summary.connectValues, 50).toFixed(1)} / ${percentile(summary.connectValues, 95).toFixed(1)}`,
    )
    lines.push(
      `- tls p50/p95(ms): ${percentile(summary.tlsValues, 50).toFixed(1)} / ${percentile(summary.tlsValues, 95).toFixed(1)}`,
    )
    lines.push(`- slow(>500ms): ${slowCount}`)
    lines.push(``)
  }

  return lines.join("\n")
}

async function main() {
  const baseUrl = process.env.OPS_BASE_URL
  if (!baseUrl) {
    throw new Error("OPS_BASE_URL is required (example: https://townpet2.vercel.app)")
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const getSamples = toPositiveInt("OPS_PERF_GET_SAMPLES", process.env.OPS_PERF_GET_SAMPLES, 30)
  const postSamples = toPositiveInt("OPS_PERF_POST_SAMPLES", process.env.OPS_PERF_POST_SAMPLES, 20)
  const pauseMs = toNonNegativeInt("OPS_PERF_PAUSE_MS", process.env.OPS_PERF_PAUSE_MS, 200)
  const outputPath =
    process.env.OPS_PERF_OUT ??
    `/tmp/townpet_latency_snapshot_${new Date().toISOString().replace(/[:.]/g, "-")}.tsv`
  const summaryPath = process.env.OPS_PERF_SUMMARY_OUT ?? `${outputPath}.summary.md`

  const endpoints: EndpointConfig[] = [
    {
      label: "api_posts_global",
      method: "GET",
      path: "/api/posts?scope=GLOBAL",
      samples: getSamples,
      pauseMs,
    },
    {
      label: "api_posts_suggestions",
      method: "GET",
      path: `/api/posts/suggestions?q=${encodeURIComponent("산책코스")}`,
      samples: getSamples,
      pauseMs,
    },
    {
      label: "api_breed_posts",
      method: "GET",
      path: `/api/lounges/breeds/golden/posts?q=${encodeURIComponent("산책")}`,
      samples: getSamples,
      pauseMs,
    },
    {
      label: "api_search_log",
      method: "POST",
      path: "/api/search/log",
      body: JSON.stringify({ q: "강아지 산책" }),
      samples: postSamples,
      pauseMs,
    },
  ]

  const records: SampleRecord[] = []

  for (const endpoint of endpoints) {
    const url = `${normalizedBaseUrl}${endpoint.path}`
    for (let index = 1; index <= endpoint.samples; index += 1) {
      const result = await runCurl(url, endpoint.method, endpoint.body)
      records.push({
        label: endpoint.label,
        index,
        method: endpoint.method,
        status: result.status,
        dnsMs: result.dnsMs,
        connectMs: result.connectMs,
        tlsMs: result.tlsMs,
        ttfbMs: result.ttfbMs,
        totalMs: result.totalMs,
        vercelCache: result.vercelCache,
        vercelId: result.vercelId,
      })

      if (endpoint.pauseMs > 0) {
        await sleep(endpoint.pauseMs)
      }
    }
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  mkdirSync(dirname(summaryPath), { recursive: true })

  const header =
    "label\tindex\tmethod\tstatus\tdns_ms\tconnect_ms\ttls_ms\tttfb_ms\ttotal_ms\tx_vercel_cache\tx_vercel_id"
  const tsvLines = records.map((row) =>
    [
      row.label,
      row.index,
      row.method,
      row.status,
      row.dnsMs.toFixed(3),
      row.connectMs.toFixed(3),
      row.tlsMs.toFixed(3),
      row.ttfbMs.toFixed(3),
      row.totalMs.toFixed(3),
      row.vercelCache,
      row.vercelId,
    ].join("\t"),
  )

  writeFileSync(outputPath, [header, ...tsvLines].join("\n"))

  const summary = buildSummary(records)
  writeFileSync(summaryPath, `${summary}\n`)

  console.log("Latency snapshot collected")
  console.log(`- baseUrl: ${normalizedBaseUrl}`)
  console.log(`- output: ${outputPath}`)
  console.log(`- summary: ${summaryPath}`)
  console.log(`- sampleCount: ${records.length}`)
  console.log("")
  console.log(summary)
}

main().catch((error) => {
  console.error("Latency snapshot collection failed")
  console.error(error)
  process.exit(1)
})
