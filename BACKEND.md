# CIG Motors — Finance Data Prep · Admin Backend

FastAPI backend that serves the React dashboard **and** an `/admin` console
for uploading source files, running the pipeline, and refreshing the
dashboard's data payload.

## What you get

- `POST /api/auth` — trade the shared admin key for a 24-hour Bearer token
- `GET  /api/data-status` — current dataset counts + last-updated dates
- `POST /api/upload` — accept an Excel file, save to `data/uploads/`, return a diff
- `POST /api/confirm-upload` — apply the merge (append / replace / cancel), kick off the pipeline
- `GET  /api/pipeline-status/:jobId` — step-by-step pipeline progress
- `GET  /api/download-template/:type` — blank Excel template with correct headers
- `GET  /docs` — interactive OpenAPI (unauthenticated pages only reveal shape, not data)
- `GET  /admin` and `GET  /` — the React SPA
- `GET  /data/dashboard_data.json` — the current pipeline output

## Local development

```bash
# Python side (backend + pipeline)
python -m pip install -r requirements.txt
cp .env.example .env       # then edit ADMIN_KEY

# React side
cd dashboard
npm install
npm run build              # produces dashboard/dist for the FastAPI static mount

# From the repo root
uvicorn backend.main:app --reload --port 8000
# → http://localhost:8000        dashboard
# → http://localhost:8000/admin  admin console (key from your .env)
# → http://localhost:8000/docs   OpenAPI
```

For a live-reload React workflow, run the Vite dev server in one terminal
(`cd dashboard && npm run dev`) and uvicorn in another. Vite proxies API
calls to `http://localhost:8000` automatically because `api.js` picks up
`import.meta.env.DEV`.

## The four data files it manages

| Card              | Where it lands                     | What the pipeline does with it |
|-------------------|------------------------------------|--------------------------------|
| GL data           | `data/current/gl_clean.xlsx`       | Full pipeline re-run           |
| Statement mapping | `data/current/statement_mapping.xlsx` | Full pipeline re-run       |
| Budget            | `data/current/budget.xlsx`         | Budget-vs-Actual tab lights up |
| Account summary   | `data/current/account_summary.xlsx` | Opening balances rolled forward |
| Prior period      | `data/current/prior_period.xlsx`   | YoY comparatives light up      |

Every raw upload is kept in `data/uploads/<timestamp>-<uploadId>__<filename>`;
the previous `data/current/<file>` is copied to `data/backups/` before it is
overwritten, so a rollback is one `mv` away.

## Deploy

### Railway or Render

- Build: `pip install -r requirements.txt && cd dashboard && npm install && npm run build`
- Start: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Env vars: `ADMIN_KEY` (required), `JWT_SECRET` (recommended), `TOKEN_TTL_HOURS`, `MAX_UPLOAD_MB`
- Persistent volume: mount `data/` so uploads and current files survive a redeploy

### Docker (optional)

```dockerfile
FROM node:20-alpine AS web
WORKDIR /app
COPY dashboard/package*.json dashboard/
RUN cd dashboard && npm ci
COPY dashboard dashboard
RUN cd dashboard && npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY pipeline pipeline
COPY backend backend
COPY --from=web /app/dashboard/dist dashboard/dist
ENV PORT=8000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
```

## Security posture

- Single shared key at rest (`ADMIN_KEY`); no user accounts, no database.
- Tokens are HMAC-signed with `JWT_SECRET`; carry only `iat` and expire after
  `TOKEN_TTL_HOURS`.
- File uploads must be `.xlsx`, ≤ `MAX_UPLOAD_MB`, and land only in
  `data/uploads/`. No arbitrary file writes.
- The pipeline runs on a worker thread (not a subprocess with user input);
  no shell interpolation of uploaded content.
- CORS is same-origin in production; permissive against `:5173` only during
  local development.
