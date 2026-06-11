from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def is_mysql_database_url(database_url: str) -> bool:
    return make_url(database_url).drivername.startswith("mysql")


def check_mysql_connection(database_url: str, init_tables: bool = False) -> int:
    if not is_mysql_database_url(database_url):
        print("DATABASE_URL must use mysql or mysql+pymysql.")
        return 2

    try:
        engine = create_engine(database_url)
        with engine.begin() as connection:
            result = connection.execute(text("SELECT DATABASE(), @@character_set_database, @@collation_database"))
            database_name, charset, collation = result.one()
            print(f"database={database_name}")
            print(f"charset={charset}")
            print(f"collation={collation}")

        if init_tables:
            from app.core.database import Base
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
            table_names = inspect(engine).get_table_names()
            print(f"table_count={len(table_names)}")
    except SQLAlchemyError as exc:
        print(f"MySQL connection failed: {exc}")
        return 1

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 MySQL 连接和空库建表准备状态。")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL", ""), help="MySQL DATABASE_URL")
    parser.add_argument("--init-tables", action="store_true", help="在目标库执行 SQLAlchemy create_all")
    args = parser.parse_args()

    if not args.database_url:
        print("DATABASE_URL is required.")
        return 2

    return check_mysql_connection(args.database_url, init_tables=args.init_tables)


if __name__ == "__main__":
    raise SystemExit(main())
