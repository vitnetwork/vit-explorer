"""
Minimal FastAPI server to serve the Vite SPA build.
All routes fall through to index.html for client-side routing.
"""
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

DIST = Path(__file__).parent / "dist"

app = FastAPI(docs_url=None, redoc_url=None)

# Mount static assets (JS, CSS, images) — only if the directory exists
_assets_dir = DIST / "assets"
if _assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")


@app.get("/health")
async def health():
    return JSONResponse({"status": "ok", "service": "vit-explorer"})


@app.get("/ping")
async def ping():
    return JSONResponse({"status": "ok"})


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """Serve index.html for all routes (SPA)."""
    return FileResponse(DIST / "index.html")


@app.get("/")
async def root():
    return FileResponse(DIST / "index.html")
