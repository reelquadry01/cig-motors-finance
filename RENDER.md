# Deploying to Render (CLI-driven)

You already have the Render CLI installed at `%USERPROFILE%\bin\render.exe`. This guide walks through the deploy end-to-end, using the CLI wherever possible and dropping to the Render dashboard only for the one thing the CLI can't do (creating a new blueprint).

## 0 — One-time terminal setup

Open a **new** terminal (so it picks up the PATH change already made), then:

```bash
render --version              # should print v2.28.0
render login                  # opens your browser, links this machine to your Render account
render workspace set          # pick your Render workspace (interactive picker)
render whoami                 # confirms you're signed in
```

## 1 — Validate the blueprint locally

```bash
cd C:/Users/USER/Downloads/Finance_DataPrep
render blueprints validate render.yaml
```

Green tick means Render will accept it.

## 2 — Push the code to GitHub

```bash
cd C:/Users/USER/Downloads/Finance_DataPrep
git add render.yaml BACKEND.md RENDER.md requirements.txt .env.example .gitignore \
        backend/ dashboard/src/components/AdminPage.jsx dashboard/src/components/Skeletons.jsx \
        dashboard/src/lib/api.js dashboard/src/App.jsx data/.gitkeep
git commit -m "Add FastAPI admin backend + Render blueprint"
git push origin master
```

## 3 — Create the blueprint (dashboard, one-time)

The CLI manages existing services but does not create a fresh blueprint from `render.yaml`. Do this once:

1. Open <https://dashboard.render.com/blueprints>.
2. Click **New Blueprint Instance** → pick the `cig-motors-finance` repo → `master` branch.
3. Render reads `render.yaml`, shows the service and disk, and asks you to fill in the two secret env vars:

    | Variable | What to enter |
    |---|---|
    | `ADMIN_KEY` | The shared password admins type on `/admin`. Pick something memorable — the Finance team default is `cig-finance-2026`. |
    | `JWT_SECRET` | Any long random string. Only the server sees it — nobody types this. Generate with `openssl rand -hex 32`. |

4. Click **Apply**. Render starts the first build.

## 4 — Watch it deploy from the CLI

Once the service exists on Render, everything else is CLI. Find it and stream logs:

```bash
render services                  # opens interactive picker; select cig-finance-admin
# Copy the service id from the list (looks like srv-cxxxxxxxxxxxxx)

# Live-stream build + runtime logs
render logs -r <service-id>

# Or trigger a fresh deploy explicitly (e.g. after a git push)
render deploys create -r <service-id>          # streams the deploy in real time
render deploys list -r <service-id>            # last 20 deploys with statuses
```

Expect the first build to take ~4-6 minutes:
1. `pip install -r requirements.txt` — FastAPI + pandas + openpyxl.
2. `npm ci` — dashboard dependencies.
3. `npm run build` — Vite bundles the SPA into `dashboard/dist/`.
4. Start command boots uvicorn on the port Render assigns.

When you see `Application startup complete.` and the health check turns green, the service URL Render printed is live.

## 5 — First sign-in

- Open `https://<your-service>.onrender.com/admin`.
- Enter the `ADMIN_KEY` you set in step 3.
- Upload the GL and the mapping. The pipeline runs on Render, writes `dashboard_data.json` to the persistent disk, and `/` refreshes.

## 6 — Custom domain

```bash
# In the Render dashboard for the service:
# Settings → Custom Domains → Add → e.g. finance.cigmotors.com
# Render prints a CNAME target. Create it at your DNS. SSL provisions automatically.
```

## Everyday CLI commands

```bash
# See what's running
render services                                # interactive
render services --output json                  # machine-readable

# Live logs (build or runtime)
render logs -r <service-id>
render logs -r <service-id> --type=app         # runtime only
render logs -r <service-id> --limit=200

# Trigger a deploy without pushing to git
render deploys create -r <service-id>

# One-off shell inside the running container (great for peeking at data/)
render ssh -r <service-id>

# Restart the service (env-var change, etc.)
render restart <service-id>

# Update the env vars from CLI
render services update -r <service-id>         # interactive editor for env vars
```

## What survives a redeploy

The persistent disk mounted at `/opt/render/project/src/data` keeps:

- `data/uploads/*` — every raw upload with its timestamp
- `data/current/*` — the active dataset the pipeline reads
- `data/backups/*` — the previous version of each file
- `dashboard/public/data/dashboard_data.json` — the FastAPI route serves the persistent-disk copy after the first pipeline run

`node_modules/` and `dashboard/dist/` are rebuilt each deploy — nothing to preserve.

## Rolling back

```bash
render deploys list -r <service-id>            # find the last good deploy id
# Then in the dashboard: Deploys → the row → Rollback.
# The persistent disk is unaffected.
```

## Costs

| Item | Cost |
|---|---|
| Starter web service | $7/mo (always on) |
| 1 GB persistent disk | $0.25/mo |
| Bandwidth (100 GB/mo included) | $0 |
| Custom domain + SSL | $0 |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Sign-in fails | Check `ADMIN_KEY` in Render env vars for exact match (no trailing whitespace) |
| Upload fine, pipeline fails | The admin page shows the traceback; you can also `render logs -r <id>` |
| Dashboard shows old data | Hard-refresh; the API sends `Cache-Control: no-store` but browsers can still cache |
| `render.exe` not found | New terminal (PATH change was persistent); if still missing, `%USERPROFILE%\bin\render.exe --version` |
