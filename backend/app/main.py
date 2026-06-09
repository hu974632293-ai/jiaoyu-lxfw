from fastapi import FastAPI

from app.api import routes_demo, routes_events, routes_knowledge, routes_leads, routes_profile, routes_projects, routes_reports
from app.core.config import settings
from app.core.database import init_db
from app.core.response import ok

app = FastAPI(title=settings.app_name)


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
