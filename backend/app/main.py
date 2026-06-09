from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    routes_demo,
    routes_events,
    routes_knowledge,
    routes_leads,
    routes_phase2,
    routes_profile,
    routes_projects,
    routes_reports,
)
from app.core.config import settings
from app.core.database import init_db
from app.core.response import ok

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    return ok({"status": "ok"})


app.include_router(routes_demo.router)
app.include_router(routes_profile.router)
app.include_router(routes_leads.router)
app.include_router(routes_projects.router)
app.include_router(routes_events.router)
app.include_router(routes_reports.router)
app.include_router(routes_knowledge.router)
app.include_router(routes_phase2.router)
