"""FastAPI entry point — serves the React dashboard and the /api routes.

Run locally:
    uvicorn backend.main:app --reload --port 8000

The React build (dashboard/dist) is mounted at /, with a fallback
handler so client-side routes like /admin resolve to index.html.
The dashboard's static JSON payload is exposed at /data/... as before.
"""
from __future__ import annotations
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import config
from .routes import auth as auth_routes
from .routes import data as data_routes
from .routes import upload as upload_routes


app = FastAPI(
    title="CIG Motors — Finance Admin API",
    version="1.0.0",
    description="Upload GL, mapping, budget and other source files; run the pipeline; refresh the dashboard.",
)

# CORS: same-origin in production; permissive in dev for the Vite server on :5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_routes.router)
app.include_router(data_routes.router)
app.include_router(upload_routes.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "cig-motors-finance-admin"}


# Serve the pipeline output at /data/... (the React app reads from here)
@app.get("/data/dashboard_data.json")
def dashboard_json() -> FileResponse:
    if not config.DASHBOARD_JSON.exists():
        return JSONResponse({"detail": "dashboard_data.json not generated yet"}, status_code=404)
    return FileResponse(
        config.DASHBOARD_JSON,
        media_type="application/json",
        headers={"Cache-Control": "no-store"},
    )


# Static React build
DIST_DIR = config.DIST_DIR
if DIST_DIR.exists():
    # /assets/* and other build outputs come straight from disk
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str, request: Request) -> FileResponse:
        """Serve any path that isn't an API route from the SPA's index.html.

        The React router then decides what to render — /admin, /, /whatever.
        Fingerprinted files (with a dot in the last segment) get served
        directly if they exist, otherwise fall through to index.html.
        """
        target = DIST_DIR / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(DIST_DIR / "index.html")
else:
    @app.get("/", include_in_schema=False)
    def not_built() -> JSONResponse:
        return JSONResponse(
            {"detail": "React build not found. Run `cd dashboard && npm run build`."},
            status_code=503,
        )
