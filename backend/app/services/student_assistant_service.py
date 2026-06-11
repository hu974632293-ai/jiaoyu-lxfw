import json
import re
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.assistant import AssistantConversation, AssistantIntentLog
from app.models.operation import AuditLog, Notification
from app.models.student import (
    StudentAcademicEvent,
    StudentApplicationProgress,
    StudentFeedbackTicket,
    StudentGrade,
    StudentLeaveApproval,
    StudentLeaveRequest,
    StudentProfile,
    StudentPsychAlert,
    StudentPsychProfile,
)
from app.models.user import SysUser
from app.schemas.student_assistant import (
    FeedbackHandleRequest,
    FeedbackReplyRequest,
    FeedbackTicketCreate,
    LeaveApprovalRequest,
    LeaveCreate,
    LeaveUpdate,
    StudentGradeCreate,
    StudentGradeUpdate,
    StudentServiceActionRequest,
    StudentChatRequest,
)


def ensure_default_student_data(db: Session) -> None:
    advisor = _ensure_system_user(db)
    if db.query(StudentProfile).count() == 0:
        student = StudentProfile(
            student_name="阶段七演示学生",
            contact_info="student@example.com",
            enrollment_project="新加坡本科申请",
            advisor_user_id=advisor.id,
            status="在读",
        )
        db.add(student)
        db.flush()
        _seed_student_items(db, student.id)
    db.commit()


def list_students(db: Session) -> list[dict[str, Any]]:
    ensure_default_student_data(db)
    students = db.query(StudentProfile).order_by(StudentProfile.id).all()
    return [serialize_student(db, item) for item in students]


def handle_student_chat(db: Session, payload: StudentChatRequest) -> dict[str, Any]:
    ensure_default_student_data(db)
    student = _get_student(db, payload.student_id)
    if not student:
        raise ValueError("学生不存在")

    message = payload.message.strip()
    intent = _detect_intent(message)
    status = "success"
    if intent == "leave_request":
        leave = create_leave_request(
            db,
            LeaveCreate(
                student_id=student.id,
                reason=message,
                start_time=_extract_leave_time(message)[0],
                end_time=_extract_leave_time(message)[1],
                actor_username=payload.actor_username,
            ),
            commit=False,
        )
        answer = "已生成请假申请，当前状态为待审批，老师处理后会记录审批人和时间。"
        result = serialize_leave(leave)
    elif intent == "psych_support":
        result = _create_psych_alert(db, student, message, payload.actor_username)
        answer = (
            f"系统已形成心理风险辅助识别提示，风险等级：{result['risk_level']}。"
            "该提示不替代专业心理诊断，建议老师尽快跟进并提供专业求助路径。"
        )
    elif intent == "application_progress":
        result = {"items": list_application_progress(db, student.id)}
        answer = "已查询申请进度，签证材料、文书和院校申请状态可在进度区查看。"
    elif intent == "academic_event":
        result = {"items": list_academic_events(db, student.id)}
        answer = "已查询学业考务节点，请关注考试、论文 DDL 和材料提交时间。"
    else:
        status = "fallback"
        result = {
            "fallback_reason": "已使用学生生活支持模板建议。",
            "support_path": "紧急事项联系学生服务部或当地紧急求助渠道。",
        }
        answer = "已提供学生生活支持建议；如涉及医疗、心理或法律问题，只提供求助路径，不直接给结论。"

    conversation = _record_conversation(db, student.id, payload.actor_username, message, answer, intent, status)
    _record_intent(db, conversation.id, intent, result, status)
    db.commit()
    return {
        "conversation_id": conversation.id,
        "intent": intent,
        "status": status,
        "answer": answer,
        "result": result,
    }


def create_leave_request(db: Session, payload: LeaveCreate, commit: bool = True) -> StudentLeaveRequest:
    ensure_default_student_data(db)
    student = _get_student(db, payload.student_id)
    if not student:
        raise ValueError("学生不存在")
    leave = StudentLeaveRequest(
        student_id=payload.student_id,
        reason=payload.reason,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status="待审批",
    )
    db.add(leave)
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        "学生提交请假",
        "student_leave_request",
        str(leave.id),
        {"student_id": payload.student_id, "student_name": student.student_name},
    )
    _create_notification(db, student.advisor_user_id, "请假待审批", f"{student.student_name} 提交了请假申请。", "student_leave", leave.id)
    if commit:
        db.commit()
        db.refresh(leave)
    return leave


def list_leave_requests(db: Session, student_id: int | None = None, status: str | None = None) -> list[dict[str, Any]]:
    ensure_default_student_data(db)
    query = db.query(StudentLeaveRequest)
    if student_id is not None:
        query = query.filter_by(student_id=student_id)
    if status:
        query = query.filter_by(status=status)
    return [serialize_leave(item) for item in query.order_by(StudentLeaveRequest.id.desc()).all()]


def get_leave_detail(db: Session, leave_id: int) -> dict[str, Any] | None:
    leave = db.query(StudentLeaveRequest).filter_by(id=leave_id).first()
    if not leave:
        return None
    approvals = (
        db.query(StudentLeaveApproval)
        .filter_by(leave_request_id=leave_id)
        .order_by(StudentLeaveApproval.id.desc())
        .all()
    )
    return {
        "leave": serialize_leave(leave),
        "approvals": [serialize_leave_approval(item) for item in approvals],
        "timeline": _resource_timeline(db, "student_leave_request", leave_id),
    }


def update_leave_request(db: Session, leave_id: int, payload: LeaveUpdate) -> StudentLeaveRequest | None:
    leave = db.query(StudentLeaveRequest).filter_by(id=leave_id).first()
    if not leave:
        return None
    if leave.status not in {"待审批", "待补充"}:
        raise ValueError("当前请假状态不支持学生修改")
    leave.reason = payload.reason
    leave.start_time = payload.start_time
    leave.end_time = payload.end_time
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        "学生修改请假",
        "student_leave_request",
        str(leave.id),
        {"reason": payload.reason, "start_time": payload.start_time.isoformat(), "end_time": payload.end_time.isoformat()},
    )
    db.commit()
    db.refresh(leave)
    return leave


def cancel_leave_request(db: Session, leave_id: int, payload: StudentServiceActionRequest) -> StudentLeaveRequest | None:
    return _change_leave_status(db, leave_id, "已撤销", "学生撤销请假", payload)


def archive_leave_request(db: Session, leave_id: int, payload: StudentServiceActionRequest) -> StudentLeaveRequest | None:
    return _change_leave_status(db, leave_id, "已归档", "请假申请归档", payload)


def approve_leave_request(db: Session, leave_id: int, payload: LeaveApprovalRequest) -> StudentLeaveRequest | None:
    leave = db.query(StudentLeaveRequest).filter_by(id=leave_id).first()
    if not leave:
        return None
    actor = _get_actor(db, payload.actor_username)
    leave.status = payload.status or "已同意"
    leave.approver_id = actor.id if actor else None
    leave.approved_at = datetime.utcnow()
    db.flush()
    db.add(
        StudentLeaveApproval(
            leave_request_id=leave.id,
            approver_id=actor.id if actor else None,
            approval_status=leave.status,
            approval_comment=payload.resolution,
            approved_at=leave.approved_at,
        )
    )
    _create_audit_log(
        db,
        payload.actor_username,
        "老师审批请假",
        "student_leave_request",
        str(leave.id),
        {"status": leave.status, "resolution": payload.resolution},
    )
    _create_notification(db, None, "请假审批已更新", f"请假申请状态：{leave.status}", "student_leave", leave.id)
    db.commit()
    db.refresh(leave)
    return leave


def _change_leave_status(db: Session, leave_id: int, status: str, action: str, payload: StudentServiceActionRequest) -> StudentLeaveRequest | None:
    leave = db.query(StudentLeaveRequest).filter_by(id=leave_id).first()
    if not leave:
        return None
    leave.status = status
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        action,
        "student_leave_request",
        str(leave.id),
        {"status": status, "reason": payload.reason},
    )
    _create_notification(db, None, "请假状态已更新", f"请假申请状态：{status}", "student_leave", leave.id)
    db.commit()
    db.refresh(leave)
    return leave


def create_feedback_ticket(db: Session, payload: FeedbackTicketCreate) -> StudentFeedbackTicket:
    ensure_default_student_data(db)
    student = _get_student(db, payload.student_id)
    if not student:
        raise ValueError("学生不存在")
    ticket = StudentFeedbackTicket(
        student_id=payload.student_id,
        category=payload.category,
        content=payload.content,
        summary=_summarize_feedback(payload.content),
        status="待处理",
    )
    db.add(ticket)
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        "学生提交反馈",
        "student_feedback_ticket",
        str(ticket.id),
        {"student_id": payload.student_id, "category": payload.category},
    )
    _create_notification(db, student.advisor_user_id, "反馈待处理", f"{student.student_name} 提交了{payload.category}反馈。", "student_feedback", ticket.id)
    db.commit()
    db.refresh(ticket)
    return ticket


def list_feedback_tickets(db: Session, student_id: int | None = None, status: str | None = None) -> list[dict[str, Any]]:
    ensure_default_student_data(db)
    query = db.query(StudentFeedbackTicket)
    if student_id is not None:
        query = query.filter_by(student_id=student_id)
    if status:
        query = query.filter_by(status=status)
    return [serialize_feedback_ticket(item) for item in query.order_by(StudentFeedbackTicket.id.desc()).all()]


def get_feedback_ticket_detail(db: Session, ticket_id: int) -> dict[str, Any] | None:
    ticket = db.query(StudentFeedbackTicket).filter_by(id=ticket_id).first()
    if not ticket:
        return None
    return {
        "ticket": serialize_feedback_ticket(ticket),
        "timeline": _resource_timeline(db, "student_feedback_ticket", ticket_id),
    }


def reply_feedback_ticket(db: Session, ticket_id: int, payload: FeedbackReplyRequest) -> StudentFeedbackTicket | None:
    ticket = db.query(StudentFeedbackTicket).filter_by(id=ticket_id).first()
    if not ticket:
        return None
    ticket.status = "处理中"
    ticket.updated_at = datetime.utcnow()
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        "学生补充反馈",
        "student_feedback_ticket",
        str(ticket.id),
        {"content": payload.content},
    )
    _create_notification(db, ticket.handler_id, "反馈补充说明", payload.content, "student_feedback", ticket.id)
    db.commit()
    db.refresh(ticket)
    return ticket


def handle_feedback_ticket(db: Session, ticket_id: int, payload: FeedbackHandleRequest) -> StudentFeedbackTicket | None:
    ticket = db.query(StudentFeedbackTicket).filter_by(id=ticket_id).first()
    if not ticket:
        return None
    actor = _get_actor(db, payload.actor_username)
    ticket.status = "已处理"
    ticket.handler_id = actor.id if actor else None
    ticket.resolution = payload.resolution
    ticket.updated_at = datetime.utcnow()
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        "老师处理反馈",
        "student_feedback_ticket",
        str(ticket.id),
        {"resolution": payload.resolution},
    )
    _create_notification(db, None, "反馈处理已更新", payload.resolution, "student_feedback", ticket.id)
    db.commit()
    db.refresh(ticket)
    return ticket


def close_feedback_ticket(db: Session, ticket_id: int, payload: StudentServiceActionRequest) -> StudentFeedbackTicket | None:
    return _change_feedback_status(db, ticket_id, "已关闭", "反馈工单关闭", payload)


def archive_feedback_ticket(db: Session, ticket_id: int, payload: StudentServiceActionRequest) -> StudentFeedbackTicket | None:
    return _change_feedback_status(db, ticket_id, "已归档", "反馈工单归档", payload)


def _change_feedback_status(db: Session, ticket_id: int, status: str, action: str, payload: StudentServiceActionRequest) -> StudentFeedbackTicket | None:
    ticket = db.query(StudentFeedbackTicket).filter_by(id=ticket_id).first()
    if not ticket:
        return None
    ticket.status = status
    if payload.reason:
        ticket.resolution = payload.reason
    ticket.updated_at = datetime.utcnow()
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        action,
        "student_feedback_ticket",
        str(ticket.id),
        {"status": status, "reason": payload.reason},
    )
    _create_notification(db, None, "反馈状态已更新", f"反馈工单状态：{status}", "student_feedback", ticket.id)
    db.commit()
    db.refresh(ticket)
    return ticket


def list_academic_events(db: Session, student_id: int) -> list[dict[str, Any]]:
    ensure_default_student_data(db)
    if not _get_student(db, student_id):
        return []
    _ensure_student_detail_data(db, student_id)
    records = db.query(StudentAcademicEvent).filter_by(student_id=student_id).order_by(StudentAcademicEvent.due_time).all()
    return [serialize_academic_event(item) for item in records]


def list_application_progress(db: Session, student_id: int) -> list[dict[str, Any]]:
    ensure_default_student_data(db)
    if not _get_student(db, student_id):
        return []
    _ensure_student_detail_data(db, student_id)
    records = (
        db.query(StudentApplicationProgress)
        .filter_by(student_id=student_id)
        .order_by(StudentApplicationProgress.id)
        .all()
    )
    return [serialize_application_progress(item) for item in records]


def list_student_grades(db: Session, student_id: int | None = None) -> list[dict[str, Any]]:
    ensure_default_student_data(db)
    query = db.query(StudentGrade)
    if student_id is not None:
        if not _get_student(db, student_id):
            return []
        query = query.filter_by(student_id=student_id)
    records = query.order_by(StudentGrade.id.desc()).all()
    return [serialize_grade(item) for item in records]


def create_student_grade(db: Session, payload: StudentGradeCreate) -> StudentGrade:
    ensure_default_student_data(db)
    student = _get_student(db, payload.student_id)
    if not student:
        raise ValueError("学生不存在")
    _validate_grade(payload.course_name, payload.score)
    grade = StudentGrade(
        student_id=payload.student_id,
        course_name=payload.course_name.strip(),
        score=payload.score,
        exam_time=payload.exam_time,
        remark=payload.teacher_feedback,
    )
    db.add(grade)
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        "老师录入成绩",
        "student_grade",
        str(grade.id),
        {
            "student_id": payload.student_id,
            "student_name": student.student_name,
            "course_name": grade.course_name,
            "score": grade.score,
        },
    )
    _create_notification(db, None, "成绩已更新", f"{student.student_name} 的 {grade.course_name} 成绩已更新。", "student_grade", grade.id)
    db.commit()
    db.refresh(grade)
    return grade


def update_student_grade(db: Session, grade_id: int, payload: StudentGradeUpdate) -> StudentGrade | None:
    grade = db.query(StudentGrade).filter_by(id=grade_id).first()
    if not grade:
        return None
    next_course_name = payload.course_name if payload.course_name is not None else grade.course_name
    next_score = payload.score if payload.score is not None else grade.score
    _validate_grade(next_course_name, next_score)
    if payload.course_name is not None:
        grade.course_name = payload.course_name.strip()
    if payload.score is not None:
        grade.score = payload.score
    if payload.exam_time is not None:
        grade.exam_time = payload.exam_time
    if payload.teacher_feedback is not None:
        grade.remark = payload.teacher_feedback
    grade.updated_at = datetime.utcnow()
    db.flush()
    _create_audit_log(
        db,
        payload.actor_username,
        "老师修改成绩",
        "student_grade",
        str(grade.id),
        {"course_name": grade.course_name, "score": grade.score, "teacher_feedback": grade.remark},
    )
    _create_notification(db, None, "成绩反馈已更新", f"{grade.course_name} 的成绩反馈已更新。", "student_grade", grade.id)
    db.commit()
    db.refresh(grade)
    return grade


def teacher_tasks(db: Session) -> dict[str, list[dict[str, Any]]]:
    ensure_default_student_data(db)
    leaves = db.query(StudentLeaveRequest).order_by(StudentLeaveRequest.id.desc()).limit(20).all()
    tickets = db.query(StudentFeedbackTicket).order_by(StudentFeedbackTicket.id.desc()).limit(20).all()
    alerts = db.query(StudentPsychAlert).order_by(StudentPsychAlert.id.desc()).limit(20).all()
    grades = db.query(StudentGrade).order_by(StudentGrade.id.desc()).limit(20).all()
    return {
        "leaves": [serialize_leave(item) for item in leaves],
        "feedback_tickets": [serialize_feedback_ticket(item) for item in tickets],
        "psych_alerts": [serialize_psych_alert(item) for item in alerts],
        "grades": [serialize_grade(item) for item in grades],
    }


def serialize_student(db: Session, item: StudentProfile) -> dict[str, Any]:
    latest_alert = (
        db.query(StudentPsychAlert)
        .filter_by(student_id=item.id)
        .order_by(StudentPsychAlert.id.desc())
        .first()
    )
    return {
        "id": item.id,
        "student_name": item.student_name,
        "contact_info": item.contact_info,
        "enrollment_project": item.enrollment_project,
        "advisor_user_id": item.advisor_user_id,
        "status": item.status,
        "risk_level": latest_alert.risk_level if latest_alert else "低",
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_leave(item: StudentLeaveRequest) -> dict[str, Any]:
    return {
        "id": item.id,
        "student_id": item.student_id,
        "reason": item.reason,
        "start_time": item.start_time.isoformat() if item.start_time else None,
        "end_time": item.end_time.isoformat() if item.end_time else None,
        "status": item.status,
        "approver_id": item.approver_id,
        "approved_at": item.approved_at.isoformat() if item.approved_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_leave_approval(item: StudentLeaveApproval) -> dict[str, Any]:
    return {
        "id": item.id,
        "leave_request_id": item.leave_request_id,
        "service_id": item.service_id,
        "approver_id": item.approver_id,
        "approval_status": item.approval_status,
        "approval_comment": item.approval_comment,
        "approved_at": item.approved_at.isoformat() if item.approved_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_feedback_ticket(item: StudentFeedbackTicket) -> dict[str, Any]:
    return {
        "id": item.id,
        "student_id": item.student_id,
        "category": item.category,
        "content": item.content,
        "summary": item.summary,
        "status": item.status,
        "handler_id": item.handler_id,
        "resolution": item.resolution,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_psych_alert(item: StudentPsychAlert) -> dict[str, Any]:
    return {
        "id": item.id,
        "student_id": item.student_id,
        "risk_level": item.risk_level,
        "trigger_reason": item.trigger_reason,
        "status": item.status,
        "handler_id": item.handler_id,
        "handled_at": item.handled_at.isoformat() if item.handled_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_academic_event(item: StudentAcademicEvent) -> dict[str, Any]:
    return {
        "id": item.id,
        "student_id": item.student_id,
        "event_name": item.event_name,
        "event_type": item.event_type,
        "due_time": item.due_time.isoformat() if item.due_time else None,
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_application_progress(item: StudentApplicationProgress) -> dict[str, Any]:
    return {
        "id": item.id,
        "student_id": item.student_id,
        "stage": item.stage,
        "status": item.status,
        "description": item.description,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_grade(item: StudentGrade) -> dict[str, Any]:
    return {
        "id": item.id,
        "student_id": item.student_id,
        "course_name": item.course_name,
        "score": item.score,
        "exam_time": item.exam_time.isoformat() if item.exam_time else None,
        "teacher_feedback": item.remark,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def _seed_student_items(db: Session, student_id: int) -> None:
    _ensure_student_detail_data(db, student_id)
    db.add(
        StudentPsychProfile(
            student_id=student_id,
            risk_score=0.2,
            emotion_tags=json.dumps(["适应中"], ensure_ascii=False),
            summary="当前为低风险，持续关注适应情况。",
        )
    )


def _ensure_student_detail_data(db: Session, student_id: int) -> None:
    if not db.query(StudentAcademicEvent).filter_by(student_id=student_id).first():
        db.add_all(
            [
                StudentAcademicEvent(
                    student_id=student_id,
                    event_name="语言考试报名确认",
                    event_type="考务",
                    due_time=datetime(2026, 7, 5, 10, 0),
                    status="未完成",
                ),
                StudentAcademicEvent(
                    student_id=student_id,
                    event_name="申请材料提交 DDL",
                    event_type="材料",
                    due_time=datetime(2026, 7, 20, 18, 0),
                    status="进行中",
                ),
            ]
        )
    if not db.query(StudentApplicationProgress).filter_by(student_id=student_id).first():
        db.add_all(
            [
                StudentApplicationProgress(
                    student_id=student_id,
                    stage="文书初稿",
                    status="已完成",
                    description="个人陈述初稿已完成，等待学生确认。",
                ),
                StudentApplicationProgress(
                    student_id=student_id,
                    stage="签证材料",
                    status="进行中",
                    description="签证材料清单已发送，待补充资金证明。",
                ),
            ]
        )
    db.flush()


def _create_psych_alert(db: Session, student: StudentProfile, message: str, actor_username: str | None) -> dict[str, Any]:
    risk_level = _detect_risk_level(message)
    alert = StudentPsychAlert(
        student_id=student.id,
        risk_level=risk_level,
        trigger_reason=f"学生表达：{message}",
        status="待跟进",
    )
    db.add(alert)
    db.flush()
    _create_audit_log(
        db,
        actor_username,
        "学生心理辅助预警",
        "student_psych_alert",
        str(alert.id),
        {"student_id": student.id, "risk_level": risk_level},
    )
    _create_notification(db, student.advisor_user_id, "心理辅助预警待跟进", f"{student.student_name} 出现{risk_level}风险辅助提示。", "student_psych_alert", alert.id)
    return serialize_psych_alert(alert)


def _detect_intent(message: str) -> str:
    if "请假" in message:
        return "leave_request"
    if any(keyword in message for keyword in ["焦虑", "撑不下去", "睡不着", "崩溃", "自伤", "轻生"]):
        return "psych_support"
    if "进度" in message or "签证" in message or "文书" in message:
        return "application_progress"
    if "考试" in message or "考务" in message or "DDL" in message or "ddl" in message:
        return "academic_event"
    return "life_support"


def _detect_risk_level(message: str) -> str:
    if any(keyword in message for keyword in ["撑不下去", "自伤", "轻生", "不想活"]):
        return "高"
    if any(keyword in message for keyword in ["焦虑", "睡不着", "崩溃"]):
        return "中"
    return "低"


def _extract_leave_time(message: str) -> tuple[datetime, datetime]:
    matches = re.findall(r"(\d{1,2})月(\d{1,2})日", message)
    if len(matches) >= 2:
        start_month, start_day = (int(part) for part in matches[0])
        end_month, end_day = (int(part) for part in matches[1])
        return datetime(2026, start_month, start_day, 9, 0), datetime(2026, end_month, end_day, 18, 0)
    return datetime(2026, 6, 12, 9, 0), datetime(2026, 6, 13, 18, 0)


def _summarize_feedback(content: str) -> str:
    return content[:40] + ("..." if len(content) > 40 else "")


def _validate_grade(course_name: str | None, score: float | None) -> None:
    if not course_name or not course_name.strip():
        raise ValueError("课程名称不能为空")
    if score is not None and not 0 <= score <= 100:
        raise ValueError("成绩必须在 0 到 100 之间")


def _record_conversation(
    db: Session,
    student_id: int,
    actor_username: str | None,
    question: str,
    answer: str,
    intent: str,
    status: str,
) -> AssistantConversation:
    actor = _get_actor(db, actor_username)
    conversation = AssistantConversation(
        user_id=actor.id if actor else None,
        student_id=student_id,
        assistant_type="student",
        question=question,
        answer=answer,
        intent=intent,
        status=status,
    )
    db.add(conversation)
    db.flush()
    return conversation


def _record_intent(db: Session, conversation_id: int, intent: str, result: dict[str, Any], status: str) -> None:
    db.add(
        AssistantIntentLog(
            conversation_id=conversation_id,
            intent=intent,
            confidence=0.84,
            parsed_payload=json.dumps(result, ensure_ascii=False),
            status=status,
        )
    )


def _resource_timeline(db: Session, resource_type: str, resource_id: int) -> list[dict[str, Any]]:
    records = (
        db.query(AuditLog)
        .filter_by(resource_type=resource_type, resource_id=str(resource_id))
        .order_by(AuditLog.id)
        .all()
    )
    timeline = []
    for record in records:
        try:
            detail = json.loads(record.detail or "{}")
        except json.JSONDecodeError:
            detail = {"raw": record.detail}
        timeline.append(
            {
                "id": record.id,
                "action": record.action,
                "resource_type": record.resource_type,
                "resource_id": record.resource_id,
                "detail": detail,
                "created_at": record.created_at.isoformat() if record.created_at else None,
            }
        )
    return timeline


def _get_student(db: Session, student_id: int) -> StudentProfile | None:
    return db.query(StudentProfile).filter_by(id=student_id).first()


def _get_actor(db: Session, username: str | None) -> SysUser | None:
    if not username:
        return None
    return db.query(SysUser).filter_by(username=username).first()


def _ensure_system_user(db: Session) -> SysUser:
    user = db.query(SysUser).filter_by(username="admin").first()
    if user:
        return user
    user = SysUser(username="admin", password_hash="demo", real_name="演示管理员", user_type="EMPLOYEE", role="admin")
    db.add(user)
    db.flush()
    return user


def _create_notification(db: Session, user_id: int | None, title: str, content: str, target_type: str, target_id: int) -> None:
    db.add(
        Notification(
            user_id=user_id,
            title=title,
            content=content,
            target_type=target_type,
            target_id=target_id,
        )
    )


def _create_audit_log(
    db: Session,
    actor_username: str | None,
    action: str,
    resource_type: str,
    resource_id: str,
    detail: dict[str, Any],
) -> None:
    actor = _get_actor(db, actor_username)
    db.add(
        AuditLog(
            actor_user_id=actor.id if actor else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=json.dumps(detail, ensure_ascii=False),
        )
    )
