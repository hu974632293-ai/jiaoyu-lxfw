"""RBAC和数据范围测试 — 批次一 Task 1 失败用例"""
from fastapi.testclient import TestClient

from app.core.database import SessionLocal, init_db
from app.main import app
from app.models.student import StudentProfile
from app.models.user import SysUser

init_db()
client = TestClient(app)


def _token(username: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


def _scope_students() -> tuple[int, int]:
    client.post("/api/demo/seed")
    with SessionLocal() as db:
        student_user = db.query(SysUser).filter_by(username="student").first()
        teacher_user = db.query(SysUser).filter_by(username="teacher").first()
        admin_user = db.query(SysUser).filter_by(username="admin").first()
        assert student_user and teacher_user and admin_user

        own_student = db.query(StudentProfile).filter_by(contact_info="student@example.com").first()
        if not own_student:
            own_student = StudentProfile(
                student_name="RBAC 自助学生",
                contact_info="student@example.com",
                enrollment_project="权限范围测试",
                advisor_user_id=teacher_user.id,
                status="在读",
            )
            db.add(own_student)
            db.flush()
        else:
            own_student.advisor_user_id = teacher_user.id

        admin_student = db.query(StudentProfile).filter_by(contact_info="rbac-admin-scope@example.com").first()
        if not admin_student:
            admin_student = StudentProfile(
                student_name="RBAC 非老师负责学生",
                contact_info="rbac-admin-scope@example.com",
                enrollment_project="权限范围测试",
                advisor_user_id=admin_user.id,
                status="在读",
            )
            db.add(admin_student)
            db.flush()
        else:
            admin_student.advisor_user_id = admin_user.id

        own_student_id = own_student.id
        admin_student_id = admin_student.id
        db.commit()
    return own_student_id, admin_student_id


def test_student_cannot_approve_leave():
    student_id, _ = _scope_students()
    student_token = _token("student", "student123")
    leave = client.post(
        "/api/student-assistant/leaves",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "student_id": student_id,
            "reason": "签证材料递交",
            "start_time": "2026-06-14T09:00:00",
            "end_time": "2026-06-14T18:00:00",
        },
    ).json()["data"]
    response = client.post(
        f"/api/student-assistant/leaves/{leave['id']}/approve",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"status": "已同意", "resolution": "学生不能自审"},
    )
    assert response.status_code == 403
    assert response.json()["code"] != 0


def test_consultant_cannot_update_unowned_lead_status():
    client.post("/api/demo/seed")
    consultant_token = _token("consultant", "consultant123")
    admin_token = _token("admin", "admin123")
    created = client.post(
        "/api/leads",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"customer_name": "范围测试客户", "contact_info": "13900008888", "background_info": "范围测试", "source_channel": "测试"},
    ).json()["data"]
    response = client.patch(
        f"/api/leads/{created['id']}/status",
        headers={"Authorization": f"Bearer {consultant_token}"},
        json={"status": "已签约", "reason": "不应越权"},
    )
    assert response.status_code == 403
    assert response.json()["code"] != 0


def test_enterprise_assistant_core_queries_reject_legacy_actor_header():
    client.post("/api/demo/seed")
    legacy_headers = {"X-Actor-Username": "admin"}

    daily_response = client.get("/api/enterprise-assistant/daily-reports", headers=legacy_headers)
    directory_response = client.get("/api/enterprise-assistant/directory", headers=legacy_headers)
    nl2sql_response = client.post(
        "/api/enterprise-assistant/nl2sql/query",
        headers=legacy_headers,
        json={"question": "查询本周高潜线索数量", "actor_username": "admin"},
    )

    for response in [daily_response, directory_response, nl2sql_response]:
        assert response.status_code == 401
        assert response.json()["code"] == 40100


def test_enterprise_assistant_core_queries_accept_bearer_token_and_enforce_role_permission():
    client.post("/api/demo/seed")
    employee_token = _token("employee", "employee123")
    student_token = _token("student", "student123")

    allowed_headers = {"Authorization": f"Bearer {employee_token}"}
    denied_headers = {"Authorization": f"Bearer {student_token}"}

    assert client.get("/api/enterprise-assistant/daily-reports", headers=allowed_headers).status_code == 200
    assert client.get("/api/enterprise-assistant/directory", headers=allowed_headers).status_code == 200
    assert (
        client.post(
            "/api/enterprise-assistant/nl2sql/query",
            headers=allowed_headers,
            json={"question": "查询本周高潜线索数量", "actor_username": "employee"},
        ).status_code
        == 200
    )

    response = client.get("/api/enterprise-assistant/daily-reports", headers=denied_headers)
    assert response.status_code == 403
    assert response.json()["code"] == 40300


def test_remaining_protected_backoffice_routes_reject_legacy_actor_header_and_accept_token():
    client.post("/api/demo/seed")
    admin_headers = {"Authorization": f"Bearer {_token('admin', 'admin123')}"}
    legacy_headers = {"X-Actor-Username": "admin"}

    legacy_requests = [
        client.post("/api/enterprise-assistant/chat", headers=legacy_headers, json={"message": "提交今日日报"}),
        client.post(
            "/api/enterprise-assistant/voice-drafts",
            headers=legacy_headers,
            json={"target_type": "daily_report", "transcript": "今天完成客户回访"},
        ),
        client.post(
            "/api/enterprise-assistant/actions/confirm",
            headers=legacy_headers,
            json={"action_type": "submit_daily_report", "idempotency_key": "legacy-confirm", "draft": {"content": "旧 header 不应确认"}},
        ),
        client.get("/api/enterprise-assistant/org-units", headers=legacy_headers),
        client.get("/api/users", headers=legacy_headers),
        client.get("/api/roles", headers=legacy_headers),
        client.get("/api/roles/permissions", headers=legacy_headers),
        client.get("/api/audit/logs", headers=legacy_headers),
        client.post("/api/audit/logs", headers=legacy_headers, json={"action": "旧 header 不应写审计"}),
        client.get("/api/reports", headers=legacy_headers),
        client.post("/api/reports/generate", headers=legacy_headers, json={"report_type": "customer_operation"}),
    ]
    for response in legacy_requests:
        assert response.status_code == 401
        assert response.json()["code"] == 40100

    allowed_requests = [
        client.post("/api/enterprise-assistant/chat", headers=admin_headers, json={"message": "查询组织架构"}),
        client.post(
            "/api/enterprise-assistant/voice-drafts",
            headers=admin_headers,
            json={"target_type": "daily_report", "transcript": "今天完成客户回访"},
        ),
        client.get("/api/enterprise-assistant/org-units", headers=admin_headers),
        client.get("/api/users", headers=admin_headers),
        client.get("/api/roles", headers=admin_headers),
        client.get("/api/roles/permissions", headers=admin_headers),
        client.get("/api/audit/logs", headers=admin_headers),
        client.get("/api/reports", headers=admin_headers),
    ]
    for response in allowed_requests:
        assert response.status_code == 200
        assert response.json()["code"] == 0


def test_crm_write_operations_reject_legacy_actor_header_and_accept_bearer_token():
    client.post("/api/demo/seed")
    admin_headers = {"Authorization": f"Bearer {_token('admin', 'admin123')}"}
    consultant_headers = {"Authorization": f"Bearer {_token('consultant', 'consultant123')}"}
    legacy_headers = {"X-Actor-Username": "admin"}

    legacy_create = client.post(
        "/api/leads",
        headers=legacy_headers,
        json={"customer_name": "legacy CRM 客户", "contact_info": "13900001111", "background_info": "不应由旧 header 写入"},
    )
    assert legacy_create.status_code == 401
    assert legacy_create.json()["code"] == 40100

    created = client.post(
        "/api/leads",
        headers=admin_headers,
        json={"customer_name": "token CRM 客户", "contact_info": "13900002222", "background_info": "真实登录写入"},
    ).json()["data"]
    lead_id = created["id"]

    legacy_responses = [
        client.post(
            f"/api/leads/{lead_id}/follow-ups",
            headers=legacy_headers,
            json={"follow_type": "电话", "content": "旧 header 不应新增跟进", "operator_username": "admin"},
        ),
        client.post(
            "/api/crm/tasks",
            headers=legacy_headers,
            json={"lead_id": lead_id, "title": "旧 header 不应创建任务", "owner_username": "admin"},
        ),
        client.patch(
            f"/api/leads/{lead_id}/status",
            headers=legacy_headers,
            json={"status": "high_potential", "reason": "旧 header 不应改状态"},
        ),
    ]
    for response in legacy_responses:
        assert response.status_code == 401
        assert response.json()["code"] == 40100

    follow_up = client.post(
        f"/api/leads/{lead_id}/follow-ups",
        headers=admin_headers,
        json={"follow_type": "电话", "content": "真实登录新增跟进", "operator_username": "admin"},
    )
    task = client.post(
        "/api/crm/tasks",
        headers=admin_headers,
        json={"lead_id": lead_id, "title": "真实登录创建任务", "owner_username": "admin"},
    )
    status = client.patch(
        f"/api/leads/{lead_id}/status",
        headers=admin_headers,
        json={"status": "high_potential", "reason": "真实登录改状态"},
    )

    assert follow_up.status_code == 200
    assert task.status_code == 200
    assert status.status_code == 200

    scoped_task_create = client.post(
        "/api/crm/tasks",
        headers=consultant_headers,
        json={"lead_id": lead_id, "title": "顾问不应创建非本人客户任务", "owner_username": "consultant"},
    )
    assert scoped_task_create.status_code == 403
    assert scoped_task_create.json()["code"] == 40301

    scoped_complete = client.patch(
        f"/api/crm/tasks/{task.json()['data']['id']}/complete",
        headers=consultant_headers,
        json={"operator_username": "consultant"},
    )
    assert scoped_complete.status_code == 403
    assert scoped_complete.json()["code"] == 40301

    legacy_complete = client.patch(
        f"/api/crm/tasks/{task.json()['data']['id']}/complete",
        headers=legacy_headers,
        json={"operator_username": "admin"},
    )
    assert legacy_complete.status_code == 401
    assert legacy_complete.json()["code"] == 40100

    complete = client.patch(
        f"/api/crm/tasks/{task.json()['data']['id']}/complete",
        headers=admin_headers,
        json={"operator_username": "admin"},
    )
    assert complete.status_code == 200
    assert complete.json()["data"]["status"] == "已完成"


def test_student_service_write_operations_reject_legacy_header_and_enforce_scope():
    own_student_id, admin_student_id = _scope_students()
    admin_headers = {"Authorization": f"Bearer {_token('admin', 'admin123')}"}
    student_headers = {"Authorization": f"Bearer {_token('student', 'student123')}"}
    teacher_headers = {"Authorization": f"Bearer {_token('teacher', 'teacher123')}"}
    legacy_headers = {"X-Actor-Username": "admin"}

    legacy_leave = client.post(
        "/api/student-assistant/leaves",
        headers=legacy_headers,
        json={
            "student_id": own_student_id,
            "reason": "旧 header 不应提交请假",
            "start_time": "2026-06-24T09:00:00",
            "end_time": "2026-06-24T18:00:00",
        },
    )
    assert legacy_leave.status_code == 401
    assert legacy_leave.json()["code"] == 40100

    scoped_leave = client.post(
        "/api/student-assistant/leaves",
        headers=student_headers,
        json={
            "student_id": admin_student_id,
            "reason": "学生不应替别人请假",
            "start_time": "2026-06-25T09:00:00",
            "end_time": "2026-06-25T18:00:00",
        },
    )
    assert scoped_leave.status_code == 403
    assert scoped_leave.json()["code"] == 40301

    leave = client.post(
        "/api/student-assistant/leaves",
        headers=student_headers,
        json={
            "student_id": own_student_id,
            "reason": "真实学生账号提交请假",
            "start_time": "2026-06-26T09:00:00",
            "end_time": "2026-06-26T18:00:00",
        },
    )
    assert leave.status_code == 200
    leave_id = leave.json()["data"]["id"]

    legacy_leave_actions = [
        client.patch(
            f"/api/student-assistant/leaves/{leave_id}",
            headers=legacy_headers,
            json={
                "reason": "旧 header 不应修改请假",
                "start_time": "2026-06-26T09:00:00",
                "end_time": "2026-06-26T18:00:00",
            },
        ),
        client.post(
            f"/api/student-assistant/leaves/{leave_id}/approve",
            headers=legacy_headers,
            json={"status": "已同意", "resolution": "旧 header 不应审批"},
        ),
        client.post(
            f"/api/student-assistant/leaves/{leave_id}/cancel",
            headers=legacy_headers,
            json={"reason": "旧 header 不应撤销"},
        ),
        client.post(
            f"/api/student-assistant/leaves/{leave_id}/archive",
            headers=legacy_headers,
            json={"reason": "旧 header 不应归档"},
        ),
    ]
    for response in legacy_leave_actions:
        assert response.status_code == 401
        assert response.json()["code"] == 40100

    teacher_approve = client.post(
        f"/api/student-assistant/leaves/{leave_id}/approve",
        headers=teacher_headers,
        json={"status": "已同意", "resolution": "老师处理本人负责学生"},
    )
    assert teacher_approve.status_code == 200

    admin_leave = client.post(
        "/api/student-assistant/leaves",
        headers=admin_headers,
        json={
            "student_id": admin_student_id,
            "reason": "非当前老师负责学生请假",
            "start_time": "2026-06-27T09:00:00",
            "end_time": "2026-06-27T18:00:00",
        },
    )
    admin_leave_id = admin_leave.json()["data"]["id"]
    teacher_scoped_approve = client.post(
        f"/api/student-assistant/leaves/{admin_leave_id}/approve",
        headers=teacher_headers,
        json={"status": "已同意", "resolution": "老师不应审批非本人负责学生"},
    )
    assert teacher_scoped_approve.status_code == 403
    assert teacher_scoped_approve.json()["code"] == 40301

    legacy_feedback = client.post(
        "/api/student-assistant/feedback-tickets",
        headers=legacy_headers,
        json={"student_id": own_student_id, "category": "建议", "content": "旧 header 不应提交反馈"},
    )
    assert legacy_feedback.status_code == 401
    assert legacy_feedback.json()["code"] == 40100

    scoped_feedback = client.post(
        "/api/student-assistant/feedback-tickets",
        headers=student_headers,
        json={"student_id": admin_student_id, "category": "建议", "content": "学生不应替别人提交反馈"},
    )
    assert scoped_feedback.status_code == 403
    assert scoped_feedback.json()["code"] == 40301

    ticket = client.post(
        "/api/student-assistant/feedback-tickets",
        headers=student_headers,
        json={"student_id": own_student_id, "category": "建议", "content": "真实学生账号提交反馈"},
    )
    assert ticket.status_code == 200
    ticket_id = ticket.json()["data"]["id"]

    legacy_feedback_actions = [
        client.post(
            f"/api/student-assistant/feedback-tickets/{ticket_id}/reply",
            headers=legacy_headers,
            json={"content": "旧 header 不应补充反馈"},
        ),
        client.post(
            f"/api/student-assistant/feedback-tickets/{ticket_id}/handle",
            headers=legacy_headers,
            json={"resolution": "旧 header 不应处理反馈"},
        ),
        client.post(
            f"/api/student-assistant/feedback-tickets/{ticket_id}/close",
            headers=legacy_headers,
            json={"reason": "旧 header 不应关闭反馈"},
        ),
        client.post(
            f"/api/student-assistant/feedback-tickets/{ticket_id}/archive",
            headers=legacy_headers,
            json={"reason": "旧 header 不应归档反馈"},
        ),
    ]
    for response in legacy_feedback_actions:
        assert response.status_code == 401
        assert response.json()["code"] == 40100

    teacher_handle = client.post(
        f"/api/student-assistant/feedback-tickets/{ticket_id}/handle",
        headers=teacher_headers,
        json={"resolution": "老师处理本人负责学生反馈"},
    )
    assert teacher_handle.status_code == 200

    legacy_grade = client.post(
        "/api/student-assistant/grades",
        headers=legacy_headers,
        json={"student_id": own_student_id, "course_name": "旧 header 成绩", "score": 80},
    )
    assert legacy_grade.status_code == 401
    assert legacy_grade.json()["code"] == 40100

    student_grade = client.post(
        "/api/student-assistant/grades",
        headers=student_headers,
        json={"student_id": own_student_id, "course_name": "学生不应录入成绩", "score": 80},
    )
    assert student_grade.status_code == 403
    assert student_grade.json()["code"] == 40300

    grade = client.post(
        "/api/student-assistant/grades",
        headers=teacher_headers,
        json={"student_id": own_student_id, "course_name": "真实老师录入成绩", "score": 88},
    )
    assert grade.status_code == 200
    grade_id = grade.json()["data"]["id"]

    legacy_grade_update = client.patch(
        f"/api/student-assistant/grades/{grade_id}",
        headers=legacy_headers,
        json={"score": 90},
    )
    assert legacy_grade_update.status_code == 401
    assert legacy_grade_update.json()["code"] == 40100

    teacher_scoped_grade = client.post(
        "/api/student-assistant/grades",
        headers=teacher_headers,
        json={"student_id": admin_student_id, "course_name": "老师不应给非本人负责学生录成绩", "score": 82},
    )
    assert teacher_scoped_grade.status_code == 403
    assert teacher_scoped_grade.json()["code"] == 40301
