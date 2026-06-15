from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import require_token_permission
from app.core.response import fail, ok
from app.models.user import SysUser
from app.schemas.consultant_agent import ConsultantAgentChatRequest, ConsultantAgentConfirmRequest
from app.services.consultant_agent_service import build_consultant_agent_draft, confirm_consultant_agent_actions
from app.services.scope_service import DataScopeError

router = APIRouter(prefix="/api/consultant-agent", tags=["consultant-agent"])


@router.post("/chat")
def chat(
    payload: ConsultantAgentChatRequest,
    current_user: SysUser = Depends(require_token_permission("crm:lead:write")),
    db: Session = Depends(get_db),
):
    try:
        return ok(build_consultant_agent_draft(db, payload, current_user))
    except DataScopeError:
        return JSONResponse(status_code=403, content=fail("无权操作该客户", 40301))
    except ValueError as exc:
        return fail(str(exc), 40401)


@router.post("/actions/confirm")
def confirm_actions(
    payload: ConsultantAgentConfirmRequest,
    current_user: SysUser = Depends(require_token_permission("crm:lead:write")),
    db: Session = Depends(get_db),
):
    try:
        return ok(confirm_consultant_agent_actions(db, payload, current_user))
    except DataScopeError:
        return JSONResponse(status_code=403, content=fail("无权操作该客户", 40301))
    except ValueError as exc:
        return fail(str(exc), 40001)
