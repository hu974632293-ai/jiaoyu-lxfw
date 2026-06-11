from sqlalchemy.exc import SQLAlchemyError

from scripts import mysql_readiness_check
from scripts.mysql_readiness_check import check_mysql_connection, is_mysql_database_url


def test_mysql_readiness_url_detection():
    assert is_mysql_database_url("mysql+pymysql://user:pass@127.0.0.1:3306/jiaoyu_lxfw")
    assert not is_mysql_database_url("sqlite:///./app.db")


def test_mysql_readiness_connection_error_is_reported_without_traceback(monkeypatch, capsys):
    def raise_connection_error(_database_url):
        raise SQLAlchemyError("access denied")

    monkeypatch.setattr(mysql_readiness_check, "create_engine", raise_connection_error)

    exit_code = check_mysql_connection("mysql+pymysql://root:@127.0.0.1:3306/jiaoyu_lxfw")

    assert exit_code == 1
    assert "MySQL connection failed: access denied" in capsys.readouterr().out
