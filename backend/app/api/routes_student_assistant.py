from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.response import fail, ok
from app.schemas.student_assistant import (
    FeedbackHandleRequest,
    FeedbackTicketCreate,
    LeaveApprovalRequest,
    StudentChatRequest,
)
from app.services.student_assistant_service import (
    approve_leave_request,
    create_feedback_ticket,
    handle_feedback_ticket,
    handle_student_chat,
    list_academic_events,
    list_application_progress,
    list_students,
    serialize_feedback_ticket,
    serialize_leave,
    teacher_tasks,
)

router = APIRouter(prefix="/api/student-assistant", tags=["student-assistant"])


@router.get("/students")
def students(db: Session = Depends(get_db)):
    return ok(list_students(db))


@router.post("/chat")
def chat(payload: StudentChatRequest, db: Session = Depends(get_db)):
    try:
        return ok(handle_student_chat(db, payload))
    except ValueError as exc:
        return fail(str(exc), 40402)


@router.post("/leaves/{leave_id}/approve")
def approve_leave(leave_id: int, payload: LeaveApprovalRequest, db: Session = Depends(get_db)):
    leave = approve_leave_request(db, leave_id, payload)
    if not leave:
        return fail("请假申请不存在", 40402)
    return ok(serialize_leave(leave))


@router.post("/feedback-tickets")
def create_feedback(payload: FeedbackTicketCreate, db: Session = Depends(get_db)):
    try:
        return ok(serialize_feedback_ticket(create_feedback_ticket(db, payload)))
    except ValueError as exc:
        return fail(str(exc), 40402)


@router.post("/feedback-tickets/{ticket_id}/handle")
def handle_feedback(ticket_id: int, payload: FeedbackHandleRequest, db: Session = Depends(get_db)):
    ticket = handle_feedback_ticket(db, ticket_id, payload)
    if not ticket:
        return fail("反馈工单不存在", 40402)
    return ok(serialize_feedback_ticket(ticket))


@router.get("/students/{student_id}/academic-events")
def academic_events(student_id: int, db: Session = Depends(get_db)):
    return ok(list_academic_events(db, student_id))


@router.get("/students/{student_id}/application-progress")
def application_progress(student_id: int, db: Session = Depends(get_db)):
    return ok(list_application_progress(db, student_id))


@router.get("/teacher-tasks")
def tasks(db: Session = Depends(get_db)):
    return ok(teacher_tasks(db))
