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
from .routes import files as files_routes
from .routes import connectors as connectors_routes
from .routes import activity as activity_routes
from .routes import settings as settings_routes
from .routes import dataset as dataset_routes


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
app.include_router(files_routes.router)
app.include_router(connectors_routes.router)
app.include_router(activity_routes.router)
app.include_router(settings_routes.router)
app.include_router(dataset_routes.router)


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


# Report export and model/industry listing
@app.get("/api/export/{model_id}")
async def export_model(model_id: str, format: str = "xlsx"):
    import json
    data_file = config.DASHBOARD_JSON
    if not data_file.exists():
        return JSONResponse({"detail": "No data available."}, status_code=404)
    data = json.loads(data_file.read_text("utf-8"))
    industry_code = data.get("industry", "automotive")
    settings_file = Path(__file__).parent.parent / "data" / "settings.json"
    settings = {}
    if settings_file.exists():
        settings = json.loads(settings_file.read_text("utf-8"))
    try:
        from pipeline.export_router import export_report
        result = export_report(model_id, data, industry_code, settings, format)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if format == "xlsx" else "application/pdf"
        filename = f"{settings.get('company_short_name', 'Report')}_{model_id}_{data.get('period', '')}.{format}"
        from fastapi.responses import Response
        return Response(content=result, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})
    except Exception as e:
        return JSONResponse({"detail": str(e)}, status_code=500)


@app.get("/api/models")
async def list_report_models(industry: str = None):
    from pipeline.models import list_models
    return list_models(industry)


@app.get("/api/industries")
async def list_industries():
    from pipeline.industries import list_industries as _list
    return _list()


# Serve starter templates at /templates/...
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
if TEMPLATES_DIR.exists():
    app.mount("/templates", StaticFiles(directory=TEMPLATES_DIR), name="templates")


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
