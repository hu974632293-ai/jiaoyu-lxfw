"""认证接口测试 — 批次一 Task 1 失败用例"""
from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app

init_db()
client = TestClient(app)


def test_login_returns_token_and_profile():
    client.post("/api/demo/seed")
    response = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["access_token"]
    assert payload["data"]["token_type"] == "bearer"
    assert payload["data"]["user"]["username"] == "admin"
    assert payload["data"]["user"]["role"] == "admin"


def test_login_rejects_wrong_password():
    client.post("/api/demo/seed")
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"})
    assert response.status_code == 401
    payload = response.json()
    assert payload["code"] != 0
    assert "账号或密码不正确" in payload["msg"]


def test_current_user_requires_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    payload = response.json()
    assert payload["code"] != 0


def test_current_user_accepts_bearer_token():
    client.post("/api/demo/seed")
    login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"}).json()["data"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {login['access_token']}"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["username"] == "admin"


def test_logout_revokes_session_token():
    client.post("/api/demo/seed")
    login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"}).json()["data"]
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    response = client.post("/api/auth/logout", headers=headers, json={"session_id": login["session_id"]})
    assert response.status_code == 200
    assert response.json()["code"] == 0

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 401
    assert me.json()["code"] != 0
