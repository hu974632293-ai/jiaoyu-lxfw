from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import (  # noqa: F401
        assistant,
        crm,
        enterprise,
        event,
        knowledge,
        lead,
        operation,
        permission,
        project,
        report,
        student,
        user,
    )

    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_compatible_columns()


def _ensure_sqlite_compatible_columns():
    if not settings.database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if "course_project" not in inspector.get_table_names():
        return
    existing_columns = {column["name"] for column in inspector.get_columns("course_project")}
    required_columns = {
        "cost_range": "VARCHAR(64) DEFAULT ''",
        "duration": "VARCHAR(64) DEFAULT ''",
        "admission_requirements": "TEXT DEFAULT ''",
        "tags": "TEXT DEFAULT '[]'",
        "recommendation_rule": "TEXT DEFAULT ''",
        "knowledge_source": "VARCHAR(128) DEFAULT ''",
        "status": "VARCHAR(32) DEFAULT '招生中'",
    }
    with engine.begin() as connection:
        for column_name, column_definition in required_columns.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE course_project ADD COLUMN {column_name} {column_definition}"))
