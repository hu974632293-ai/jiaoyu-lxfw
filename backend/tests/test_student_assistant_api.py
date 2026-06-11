from fastapi.testclient import TestClient

from app.core.database import init_db
from app.main import app


init_db()
client = TestClient(app)


def test_student_assistant_chat_leave_feedback_psych_and_progress_api():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    assert seed_response.json()["code"] == 0

    students_response = client.get("/api/student-assistant/students")
    assert students_response.status_code == 200
    students_payload = students_response.json()
    assert students_payload["code"] == 0
    assert students_payload["data"]
    student_id = students_payload["data"][0]["id"]

    leave_chat_response = client.post(
        "/api/student-assistant/chat",
        json={
            "student_id": student_id,
            "message": "我想请假两天，6月12日到6月13日，因为要去递交签证材料。",
            "actor_username": "admin",
        },
    )
    assert leave_chat_response.status_code == 200
    leave_chat_payload = leave_chat_response.json()
    assert leave_chat_payload["code"] == 0
    assert leave_chat_payload["data"]["intent"] == "leave_request"
    assert leave_chat_payload["data"]["result"]["status"] == "待审批"
    leave_id = leave_chat_payload["data"]["result"]["id"]

    approve_response = client.post(
        f"/api/student-assistant/leaves/{leave_id}/approve",
        json={"status": "已同意", "resolution": "同意请假，返校后补交材料。", "actor_username": "admin"},
    )
    assert approve_response.status_code == 200
    approve_payload = approve_response.json()
    assert approve_payload["code"] == 0
    assert approve_payload["data"]["status"] == "已同意"
    assert approve_payload["data"]["approved_at"]

    feedback_response = client.post(
        "/api/student-assistant/feedback-tickets",
        json={
            "student_id": student_id,
            "category": "投诉",
            "content": "住宿安排沟通不及时，希望老师今天给一个明确处理结果。",
            "actor_username": "admin",
        },
    )
    assert feedback_response.status_code == 200
    feedback_payload = feedback_response.json()
    assert feedback_payload["code"] == 0
    assert feedback_payload["data"]["status"] == "待处理"
    ticket_id = feedback_payload["data"]["id"]

    handle_feedback_response = client.post(
        f"/api/student-assistant/feedback-tickets/{ticket_id}/handle",
        json={"resolution": "已联系住宿顾问，今天 18:00 前同步处理结果。", "actor_username": "admin"},
    )
    assert handle_feedback_response.status_code == 200
    handle_feedback_payload = handle_feedback_response.json()
    assert handle_feedback_payload["code"] == 0
    assert handle_feedback_payload["data"]["status"] == "已处理"
    assert "18:00" in handle_feedback_payload["data"]["resolution"]

    psych_response = client.post(
        "/api/student-assistant/chat",
        json={
            "student_id": student_id,
            "message": "我最近非常焦虑，睡不着，感觉撑不下去了。",
            "actor_username": "admin",
        },
    )
    assert psych_response.status_code == 200
    psych_payload = psych_response.json()
    assert psych_payload["code"] == 0
    assert psych_payload["data"]["intent"] == "psych_support"
    assert psych_payload["data"]["result"]["risk_level"] == "高"
    assert "辅助识别" in psych_payload["data"]["answer"]
    assert "不替代专业心理诊断" in psych_payload["data"]["answer"]

    academics_response = client.get(f"/api/student-assistant/students/{student_id}/academic-events")
    assert academics_response.status_code == 200
    academics_payload = academics_response.json()
    assert academics_payload["code"] == 0
    assert any("考试" in item["event_name"] or item["event_type"] == "考务" for item in academics_payload["data"])

    progress_response = client.get(f"/api/student-assistant/students/{student_id}/application-progress")
    assert progress_response.status_code == 200
    progress_payload = progress_response.json()
    assert progress_payload["code"] == 0
    assert any(item["stage"] == "签证材料" for item in progress_payload["data"])

    overview_response = client.get("/api/student-assistant/teacher-tasks")
    assert overview_response.status_code == 200
    overview_payload = overview_response.json()
    assert overview_payload["code"] == 0
    assert any(item["id"] == leave_id for item in overview_payload["data"]["leaves"])
    assert any(item["id"] == ticket_id for item in overview_payload["data"]["feedback_tickets"])
    assert overview_payload["data"]["psych_alerts"]

    audit_response = client.get("/api/audit/logs")
    assert audit_response.status_code == 200
    audit_actions = [item["action"] for item in audit_response.json()["data"]]
    assert "学生提交请假" in audit_actions
    assert "老师审批请假" in audit_actions
    assert "学生提交反馈" in audit_actions
    assert "老师处理反馈" in audit_actions
    assert "学生心理辅助预警" in audit_actions


def test_student_leave_request_supports_student_and_teacher_lifecycle():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    student_id = client.get("/api/student-assistant/students").json()["data"][0]["id"]

    create_response = client.post(
        "/api/student-assistant/leaves",
        json={
            "student_id": student_id,
            "reason": "6月20日需要办理签证材料，请假一天。",
            "start_time": "2026-06-20T09:00:00",
            "end_time": "2026-06-20T18:00:00",
            "actor_username": "admin",
        },
    )
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_payload["code"] == 0
    leave_id = create_payload["data"]["id"]
    assert create_payload["data"]["status"] == "待审批"

    update_response = client.patch(
        f"/api/student-assistant/leaves/{leave_id}",
        json={
            "reason": "6月20日需要办理签证材料，并补交护照复印件。",
            "start_time": "2026-06-20T09:00:00",
            "end_time": "2026-06-20T18:00:00",
            "actor_username": "admin",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["data"]["reason"].endswith("护照复印件。")

    list_response = client.get(f"/api/student-assistant/leaves?student_id={student_id}")
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["code"] == 0
    assert any(item["id"] == leave_id for item in list_payload["data"])

    detail_response = client.get(f"/api/student-assistant/leaves/{leave_id}")
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["code"] == 0
    assert detail_payload["data"]["leave"]["id"] == leave_id
    assert any(item["action"] == "学生修改请假" for item in detail_payload["data"]["timeline"])

    approve_response = client.post(
        f"/api/student-assistant/leaves/{leave_id}/approve",
        json={"status": "已同意", "resolution": "同意请假，返校后补交材料。", "actor_username": "admin"},
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["data"]["status"] == "已同意"

    archive_response = client.post(
        f"/api/student-assistant/leaves/{leave_id}/archive",
        json={"reason": "审批完成后归档。", "actor_username": "admin"},
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["data"]["status"] == "已归档"

    cancel_create_response = client.post(
        "/api/student-assistant/leaves",
        json={
            "student_id": student_id,
            "reason": "临时请假申请，稍后撤销。",
            "start_time": "2026-06-22T09:00:00",
            "end_time": "2026-06-22T18:00:00",
            "actor_username": "admin",
        },
    )
    cancel_leave_id = cancel_create_response.json()["data"]["id"]
    cancel_response = client.post(
        f"/api/student-assistant/leaves/{cancel_leave_id}/cancel",
        json={"reason": "行程取消，撤销请假。", "actor_username": "admin"},
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["data"]["status"] == "已撤销"


def test_student_feedback_ticket_supports_reply_close_archive_and_history():
    seed_response = client.post("/api/demo/seed")
    assert seed_response.status_code == 200
    student_id = client.get("/api/student-assistant/students").json()["data"][0]["id"]

    create_response = client.post(
        "/api/student-assistant/feedback-tickets",
        json={
            "student_id": student_id,
            "category": "投诉",
            "content": "住宿安排没有按承诺时间反馈，希望今天给出明确方案。",
            "actor_username": "admin",
        },
    )
    assert create_response.status_code == 200
    ticket_id = create_response.json()["data"]["id"]

    reply_response = client.post(
        f"/api/student-assistant/feedback-tickets/{ticket_id}/reply",
        json={"content": "学生补充：希望优先保留原住宿区域。", "actor_username": "admin"},
    )
    assert reply_response.status_code == 200
    assert reply_response.json()["data"]["status"] == "处理中"

    handle_response = client.post(
        f"/api/student-assistant/feedback-tickets/{ticket_id}/handle",
        json={"resolution": "已联系住宿顾问，今天 18:00 前同步处理结果。", "actor_username": "admin"},
    )
    assert handle_response.status_code == 200
    assert handle_response.json()["data"]["status"] == "已处理"

    close_response = client.post(
        f"/api/student-assistant/feedback-tickets/{ticket_id}/close",
        json={"reason": "学生确认处理结果。", "actor_username": "admin"},
    )
    assert close_response.status_code == 200
    assert close_response.json()["data"]["status"] == "已关闭"

    archive_response = client.post(
        f"/api/student-assistant/feedback-tickets/{ticket_id}/archive",
        json={"reason": "服务记录归档。", "actor_username": "admin"},
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["data"]["status"] == "已归档"

    list_response = client.get(f"/api/student-assistant/feedback-tickets?student_id={student_id}")
    assert list_response.status_code == 200
    assert any(item["id"] == ticket_id and item["status"] == "已归档" for item in list_response.json()["data"])

    detail_response = client.get(f"/api/student-assistant/feedback-tickets/{ticket_id}")
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["data"]["ticket"]["id"] == ticket_id
    timeline_actions = [item["action"] for item in detail_payload["data"]["timeline"]]
    assert "学生补充反馈" in timeline_actions
    assert "老师处理反馈" in timeline_actions
    assert "反馈工单关闭" in timeline_actions
