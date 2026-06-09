from fastapi import FastAPI

from app.api import routes_demo, routes_profile
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
