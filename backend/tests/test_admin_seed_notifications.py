from sqlalchemy import event
from sqlalchemy.orm import Session as OrmSession

from app.core.database import SessionLocal, init_db
from app.models.crm import CrmTask
from app.models.operation import Notification
from app.services.admin_service import DEFAULT_NOTIFICATIONS, ensure_default_admin_data
from app.services.seed_service import seed_demo_data


def test_default_notifications_are_recreated_when_existing_rows_disappear_before_commit():
    init_db()

    setup_db = SessionLocal()
    try:
        ensure_default_admin_data(setup_db)
    finally:
        setup_db.close()

    db = SessionLocal()

    deleted_once = False

    def delete_notifications_before_flush(session, _flush_context, _instances):
        nonlocal deleted_once
        if deleted_once:
            return
        if not any(isinstance(item, Notification) for item in session.dirty):
            return
        deleted_once = True
        cleanup_db = SessionLocal()
        try:
            cleanup_db.query(Notification).delete(synchronize_session=False)
            cleanup_db.commit()
        finally:
            cleanup_db.close()

    event.listen(OrmSession, "before_flush", delete_notifications_before_flush)
    try:
        ensure_default_admin_data(db)

        default_titles = {title for title, _content, _target_type, _target_id in DEFAULT_NOTIFICATIONS}
        actual_titles = {item.title for item in db.query(Notification).all()}

        assert default_titles <= actual_titles
    finally:
        if event.contains(OrmSession, "before_flush", delete_notifications_before_flush):
            event.remove(OrmSession, "before_flush", delete_notifications_before_flush)
        db.close()


def test_seed_demo_data_discards_stale_business_objects_before_reseed():
    init_db()

    setup_db = SessionLocal()
    try:
        seed_demo_data(setup_db)
    finally:
        setup_db.close()

    db = SessionLocal()
    try:
        task = CrmTask(title="待重置的陈旧任务")
        db.add(task)
        db.commit()
        task = db.query(CrmTask).filter_by(title="待重置的陈旧任务").first()
        assert task is not None
        task.status = "已完成"

        result = seed_demo_data(db)

        assert result["notifications"] >= len(DEFAULT_NOTIFICATIONS)
        assert db.query(CrmTask).count() > 0
    finally:
        db.close()
