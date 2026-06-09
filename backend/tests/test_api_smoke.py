from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["code"] == 0


def test_profile_assess():
    response = client.post("/api/profile/assess", json={"raw_input": "19岁 高中毕业 希望新加坡升学", "source_type": "text"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == 0
    assert payload["data"]["matched_project"] == "新加坡国际本硕升学计划"
