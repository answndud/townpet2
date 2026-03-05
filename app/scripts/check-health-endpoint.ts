import "dotenv/config"

type HealthResponse = {
  ok?: boolean
  status?: string
  timestamp?: string
  durationMs?: number
  checks?: {
    search?: {
      pgTrgm?: {
        state?: string
        enabled?: boolean
        message?: string
      }
    }
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "")
}

async function main() {
  const baseUrl = process.env.OPS_BASE_URL
  const healthInternalToken = process.env.OPS_HEALTH_INTERNAL_TOKEN?.trim() ?? ""
  const requirePgTrgm = (process.env.OPS_HEALTH_REQUIRE_PG_TRGM ?? "").trim() === "1"

  if (!baseUrl) {
    throw new Error("OPS_BASE_URL is required (example: https://townpet.example.com)")
  }

  const headers: Record<string, string> = {
    accept: "application/json",
    "cache-control": "no-cache",
  }
  if (healthInternalToken) {
    headers["x-health-token"] = healthInternalToken
  }

  const url = `${normalizeBaseUrl(baseUrl)}/api/health`
  const startedAt = Date.now()
  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  })

  let payload: HealthResponse | null = null
  try {
    payload = (await response.json()) as HealthResponse
  } catch {
    payload = null
  }

  if (response.status !== 200) {
    throw new Error(
      `Health endpoint returned HTTP ${response.status}. body=${JSON.stringify(payload)}`,
    )
  }

  if (!payload || payload.status !== "ok" || payload.ok !== true) {
    throw new Error(`Health endpoint is not healthy. body=${JSON.stringify(payload)}`)
  }

  console.log("Health check passed")
  console.log(`- url: ${url}`)
  console.log(`- status: ${response.status}`)
  console.log(`- payload.status: ${payload.status}`)
  console.log(`- payload.timestamp: ${payload.timestamp ?? "unknown"}`)
  console.log(`- elapsedMs: ${Date.now() - startedAt}`)
  if (healthInternalToken) {
    const pgTrgm = payload.checks?.search?.pgTrgm
    if (pgTrgm) {
      console.log(`- search.pgTrgm.state: ${pgTrgm.state ?? "unknown"}`)
      console.log(`- search.pgTrgm.enabled: ${String(pgTrgm.enabled ?? false)}`)
      console.log(`- search.pgTrgm.message: ${pgTrgm.message ?? "n/a"}`)
    } else {
      console.log("- search.pgTrgm: unavailable (token invalid or endpoint detail disabled)")
    }
  }

  if (requirePgTrgm) {
    const pgTrgm = payload.checks?.search?.pgTrgm
    if (!pgTrgm || pgTrgm.enabled !== true) {
      throw new Error(
        `pg_trgm requirement failed. set OPS_HEALTH_INTERNAL_TOKEN and check /api/health detail. payload=${JSON.stringify(payload)}`,
      )
    }
  }
}

main().catch((error) => {
  console.error("Health check failed")
  console.error(error)
  process.exit(1)
})
