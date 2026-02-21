import "dotenv/config"
import { randomUUID } from "crypto"

type SentryConfig = {
  host: string
  projectId: string
  publicKey: string
}

function parseDsn(dsn: string): SentryConfig {
  const parsed = new URL(dsn)
  const projectId = parsed.pathname.split("/").filter(Boolean).pop()
  const publicKey = parsed.username

  if (!projectId || !publicKey) {
    throw new Error("Invalid SENTRY_DSN: project id or public key is missing")
  }

  return {
    host: parsed.origin,
    projectId,
    publicKey,
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendEvent(config: SentryConfig, marker: string, environment: string) {
  const eventId = randomUUID().replace(/-/g, "")
  const url = `${config.host}/api/${config.projectId}/store/?sentry_version=7&sentry_key=${config.publicKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      environment,
      message: marker,
      tags: {
        source: "ops-smoke",
      },
      extra: {
        marker,
      },
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Sentry store API failed: HTTP ${response.status} body=${body}`)
  }

  return eventId
}

async function waitForEvent(
  host: string,
  orgSlug: string,
  projectSlug: string,
  eventId: string,
  authToken: string,
  timeoutMs: number,
) {
  const startedAt = Date.now()
  const url = `${host}/api/0/projects/${orgSlug}/${projectSlug}/events/${eventId}/`

  while (Date.now() - startedAt <= timeoutMs) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    })

    if (response.ok) {
      return
    }

    if (response.status !== 404) {
      const body = await response.text()
      throw new Error(`Sentry event lookup failed: HTTP ${response.status} body=${body}`)
    }

    await sleep(3000)
  }

  throw new Error(`Timed out while waiting for Sentry event ${eventId}`)
}

async function main() {
  const dsn = requiredEnv("SENTRY_DSN")
  const authToken = requiredEnv("SENTRY_AUTH_TOKEN")
  const orgSlug = requiredEnv("SENTRY_ORG_SLUG")
  const projectSlug = requiredEnv("SENTRY_PROJECT_SLUG")
  const environment = process.env.SENTRY_SMOKE_ENVIRONMENT ?? "ops-smoke"
  const timeoutMs = Number(process.env.SENTRY_SMOKE_TIMEOUT_MS ?? "90000")

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("SENTRY_SMOKE_TIMEOUT_MS must be a positive number")
  }

  const config = parseDsn(dsn)
  const marker = `townpet-ops-sentry-smoke-${Date.now()}`

  const eventId = await sendEvent(config, marker, environment)
  await waitForEvent(
    config.host,
    orgSlug,
    projectSlug,
    eventId,
    authToken,
    timeoutMs,
  )

  console.log("Sentry ingestion check passed")
  console.log(`- org/project: ${orgSlug}/${projectSlug}`)
  console.log(`- eventId: ${eventId}`)
  console.log(`- marker: ${marker}`)
}

main().catch((error) => {
  console.error("Sentry ingestion check failed")
  console.error(error)
  process.exit(1)
})
