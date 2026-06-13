from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_permission
from app.core.response import fail, ok
from fastapi.responses import JSONResponse
from app.models.user import SysUser
from app.services.scope_service import DataScopeError, ensure_can_access_student
from app.schemas.student_assistant import (
    FeedbackReplyRequest,
    FeedbackHandleRequest,
    FeedbackTicketCreate,
    LeaveApprovalRequest,
    LeaveCreate,
    LeaveUpdate,
    StudentGradeCreate,
    StudentGradeUpdate,
    StudentServiceActionRequest,
    StudentChatRequest,
)
from app.services.student_assistant_service import (
    archive_feedback_ticket,
    archive_leave_request,
    approve_leave_request,
    cancel_leave_request,
    close_feedback_ticket,
    create_feedback_ticket,
    create_student_grade,
    create_leave_request,
    get_feedback_ticket_detail,
    get_leave_detail,
    handle_feedback_ticket,
    handle_student_chat,
    list_feedback_tickets,
    list_academic_events,
    list_application_progress,
    list_student_grades,
    list_leave_requests,
    list_students,
    reply_feedback_ticket,
    serialize_feedback_ticket,
    serialize_grade,
    serialize_leave,
    teacher_tasks,
    update_student_grade,
    update_leave_request,
)

router = APIRouter(prefix="/api/student-assistant", tags=["student-assistant"])


@router.get("/students")
def students(current_user: SysUser = Depends(require_permission("assistant:student:use")), db: Session = Depends(get_db)):
    return ok(list_students(db))


@router.post("/chat")
def chat(payload: StudentChatRequest, db: Session = Depends(get_db)):
    try:
        return ok(handle_student_chat(db, payload))
    except ValueError as exc:
        return fail(str(exc), 40402)


@router.get("/leaves")
def list_leaves(student_id: int | None = None, status: str | None = None, db: Session = Depends(get_db)):
    return ok(list_leave_requests(db, student_id, status))


@router.post("/leaves")
def create_leave(payload: LeaveCreate, current_user: SysUser = Depends(require_permission("assistant:student:use")), db: Session = Depends(get_db)):
    try:
        return ok(serialize_leave(create_leave_request(db, payload)))
    except ValueError as exc:
        return fail(str(exc), 40402)


@router.get("/leaves/{leave_id}")
def get_leave(leave_id: int, db: Session = Depends(get_db)):
    detail = get_leave_detail(db, leave_id)
    if not detail:
        return fail("请假申请不存在", 40402)
    return ok(detail)


@router.patch("/leaves/{leave_id}")
def update_leave(leave_id: int, payload: LeaveUpdate, db: Session = Depends(get_db)):
    try:
        leave = update_leave_request(db, leave_id, payload)
    except ValueError as exc:
        return fail(str(exc), 40002)
    if not leave:
        return fail("请假申请不存在", 40402)
    return ok(serialize_leave(leave))


@router.post("/leaves/{leave_id}/approve")
def approve_leave(leave_id: int, payload: LeaveApprovalRequest, current_user: SysUser = Depends(require_permission("student:leave:approve")), db: Session = Depends(get_db)):
    leave = approve_leave_request(db, leave_id, payload)
    if not leave:
        return fail("请假申请不存在", 40402)
    return ok(serialize_leave(leave))


@router.post("/leaves/{leave_id}/cancel")
def cancel_leave(leave_id: int, payload: StudentServiceActionRequest, db: Session = Depends(get_db)):
    leave = cancel_leave_request(db, leave_id, payload)
    if not leave:
        return fail("请假申请不存在", 40402)
    return ok(serialize_leave(leave))


@router.post("/leaves/{leave_id}/archive")
def archive_leave(leave_id: int, payload: StudentServiceActionRequest, db: Session = Depends(get_db)):
    leave = archive_leave_request(db, leave_id, payload)
    if not leave:
        return fail("请假申请不存在", 40402)
    return ok(serialize_leave(leave))


@router.get("/feedback-tickets")
def list_feedback(student_id: int | None = None, status: str | None = None, db: Session = Depends(get_db)):
    return ok(list_feedback_tickets(db, student_id, status))


@router.post("/feedback-tickets")
def create_feedback(payload: FeedbackTicketCreate, db: Session = Depends(get_db)):
    try:
        return ok(serialize_feedback_ticket(create_feedback_ticket(db, payload)))
    except ValueError as exc:
        return fail(str(exc), 40402)


@router.get("/feedback-tickets/{ticket_id}")
def get_feedback(ticket_id: int, db: Session = Depends(get_db)):
    detail = get_feedback_ticket_detail(db, ticket_id)
    if not detail:
        return fail("反馈工单不存在", 40402)
    return ok(detail)


@router.post("/feedback-tickets/{ticket_id}/reply")
def reply_feedback(ticket_id: int, payload: FeedbackReplyRequest, db: Session = Depends(get_db)):
    ticket = reply_feedback_ticket(db, ticket_id, payload)
    if not ticket:
        return fail("反馈工单不存在", 40402)
    return ok(serialize_feedback_ticket(ticket))


@router.post("/feedback-tickets/{ticket_id}/handle")
def handle_feedback(ticket_id: int, payload: FeedbackHandleRequest, db: Session = Depends(get_db)):
    ticket = handle_feedback_ticket(db, ticket_id, payload)
    if not ticket:
        return fail("反馈工单不存在", 40402)
    return ok(serialize_feedback_ticket(ticket))


@router.post("/feedback-tickets/{ticket_id}/close")
def close_feedback(ticket_id: int, payload: StudentServiceActionRequest, db: Session = Depends(get_db)):
    ticket = close_feedback_ticket(db, ticket_id, payload)
    if not ticket:
        return fail("反馈工单不存在", 40402)
    return ok(serialize_feedback_ticket(ticket))


@router.post("/feedback-tickets/{ticket_id}/archive")
def archive_feedback(ticket_id: int, payload: StudentServiceActionRequest, db: Session = Depends(get_db)):
    ticket = archive_feedback_ticket(db, ticket_id, payload)
    if not ticket:
        return fail("反馈工单不存在", 40402)
    return ok(serialize_feedback_ticket(ticket))


@router.get("/students/{student_id}/academic-events")
def academic_events(student_id: int, db: Session = Depends(get_db)):
    return ok(list_academic_events(db, student_id))


@router.get("/students/{student_id}/application-progress")
def application_progress(student_id: int, db: Session = Depends(get_db)):
    return ok(list_application_progress(db, student_id))


@router.get("/students/{student_id}/grades")
def student_grades(student_id: int, db: Session = Depends(get_db)):
    return ok(list_student_grades(db, student_id))


@router.get("/grades")
def grades(student_id: int | None = None, db: Session = Depends(get_db)):
    return ok(list_student_grades(db, student_id))


@router.post("/grades")
def create_grade(payload: StudentGradeCreate, db: Session = Depends(get_db)):
    try:
        return ok(serialize_grade(create_student_grade(db, payload)))
    except ValueError as exc:
        return fail(str(exc), 40002)


@router.patch("/grades/{grade_id}")
def update_grade(grade_id: int, payload: StudentGradeUpdate, db: Session = Depends(get_db)):
    try:
        grade = update_student_grade(db, grade_id, payload)
    except ValueError as exc:
        return fail(str(exc), 40002)
    if not grade:
        return fail("成绩记录不存在", 40402)
    return ok(serialize_grade(grade))


@router.get("/teacher-tasks")
def tasks(db: Session = Depends(get_db)):
    return ok(teacher_tasks(db))
