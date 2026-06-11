from scripts.mysql_readiness_check import is_mysql_database_url


def test_mysql_readiness_url_detection():
    assert is_mysql_database_url("mysql+pymysql://user:pass@127.0.0.1:3306/jiaoyu_lxfw")
    assert not is_mysql_database_url("sqlite:///./app.db")
