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
    table_names = set(inspector.get_table_names())
    if "course_project" in table_names:
        _add_missing_columns(
            "course_project",
            {column["name"] for column in inspector.get_columns("course_project")},
            {
                "cost_range": "VARCHAR(64) DEFAULT ''",
                "duration": "VARCHAR(64) DEFAULT ''",
                "admission_requirements": "TEXT DEFAULT ''",
                "tags": "TEXT DEFAULT '[]'",
                "recommendation_rule": "TEXT DEFAULT ''",
                "knowledge_source": "VARCHAR(128) DEFAULT ''",
                "status": "VARCHAR(32) DEFAULT '招生中'",
            },
        )
    if "event_lecture" in table_names:
        _add_missing_columns(
            "event_lecture",
            {column["name"] for column in inspector.get_columns("event_lecture")},
            {
                "target_audience": "VARCHAR(255) DEFAULT ''",
                "speaker": "VARCHAR(64) DEFAULT ''",
                "status": "VARCHAR(32) DEFAULT '草稿'",
                "description": "TEXT DEFAULT ''",
            },
        )
    if "event_registration" in table_names:
        _add_missing_columns(
            "event_registration",
            {column["name"] for column in inspector.get_columns("event_registration")},
            {
                "subject_type": "VARCHAR(32) DEFAULT 'lead'",
                "subject_id": "INTEGER",
                "subject_name": "VARCHAR(64) DEFAULT ''",
                "contact_info": "VARCHAR(255) DEFAULT ''",
                "source_channel": "VARCHAR(64) DEFAULT ''",
                "checked_in_at": "DATETIME",
            },
        )
        _ensure_event_registration_nullable_lead_id(inspector)
    if "knowledge_chat_log" in table_names:
        _add_missing_columns(
            "knowledge_chat_log",
            {column["name"] for column in inspector.get_columns("knowledge_chat_log")},
            {
                "scene": "VARCHAR(64) DEFAULT 'customer_service'",
                "fallback_reason": "TEXT DEFAULT ''",
            },
        )
    if "knowledge_source" in table_names:
        _add_missing_columns(
            "knowledge_source",
            {column["name"] for column in inspector.get_columns("knowledge_source")},
            {
                "scene": "VARCHAR(64) DEFAULT 'customer_service'",
                "owner": "VARCHAR(64) DEFAULT ''",
                "description": "TEXT DEFAULT ''",
            },
        )


def _add_missing_columns(table_name: str, existing_columns: set[str], required_columns: dict[str, str]) -> None:
    missing_columns = {
        column_name: column_definition
        for column_name, column_definition in required_columns.items()
        if column_name not in existing_columns
    }
    if not missing_columns:
        return
    with engine.begin() as connection:
        for column_name, column_definition in missing_columns.items():
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"))


def _ensure_event_registration_nullable_lead_id(inspector) -> None:
    columns = inspector.get_columns("event_registration")
    lead_id_column = next((column for column in columns if column["name"] == "lead_id"), None)
    if not lead_id_column or lead_id_column.get("nullable", True):
        return

    with engine.begin() as connection:
        connection.execute(text("PRAGMA foreign_keys=OFF"))
        connection.execute(text("ALTER TABLE event_registration RENAME TO event_registration_legacy"))
        connection.execute(
            text(
                """
                CREATE TABLE event_registration (
                    id INTEGER NOT NULL PRIMARY KEY,
                    event_id INTEGER NOT NULL,
                    lead_id INTEGER,
                    subject_type VARCHAR(32) NOT NULL,
                    subject_id INTEGER,
                    subject_name VARCHAR(64) NOT NULL,
                    contact_info VARCHAR(255) NOT NULL,
                    source_channel VARCHAR(64) NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    checked_in_at DATETIME,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY(event_id) REFERENCES event_lecture (id),
                    FOREIGN KEY(lead_id) REFERENCES crm_lead (id)
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO event_registration (
                    id,
                    event_id,
                    lead_id,
                    subject_type,
                    subject_id,
                    subject_name,
                    contact_info,
                    source_channel,
                    status,
                    checked_in_at,
                    created_at
                )
                SELECT
                    id,
                    event_id,
                    NULLIF(lead_id, 0),
                    subject_type,
                    subject_id,
                    subject_name,
                    contact_info,
                    source_channel,
                    status,
                    checked_in_at,
                    created_at
                FROM event_registration_legacy
                """
            )
        )
        connection.execute(text("DROP TABLE event_registration_legacy"))
        connection.execute(text("PRAGMA foreign_keys=ON"))
