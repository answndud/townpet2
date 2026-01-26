# Local dev auth env

Purpose
- Track temporary auth environment values used for local development
- Prevent forgetting to replace them for staging/production

Current local values
- Location: `app/.env` and `app/.env.local`
- `NEXTAUTH_URL`: `http://localhost:3000`
- `NEXTAUTH_SECRET`: `dev-local-nextauth-secret-2026-01-25`
- `AUTH_URL`: `http://localhost:3000`
- `AUTH_SECRET`: `dev-local-nextauth-secret-2026-01-25`

Notes
- These values are for local development only
- Rotate to a new secret for any shared or deployed environment
