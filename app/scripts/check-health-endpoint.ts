import "dotenv/config"

type HealthResponse = {
  ok?: boolean
  status?: string
  timestamp?: string
  durationMs?: number
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "")
}

async function main() {
  const baseUrl = process.env.OPS_BASE_URL

  if (!baseUrl) {
    throw new Error("OPS_BASE_URL is required (example: https://townpet.example.com)")
  }

  const url = `${normalizeBaseUrl(baseUrl)}/api/health`
  const startedAt = Date.now()
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
    },
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
}

main().catch((error) => {
  console.error("Health check failed")
  console.error(error)
  process.exit(1)
})
