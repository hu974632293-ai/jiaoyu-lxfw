from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SysRole(Base):
    __tablename__ = "sys_role"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    role_name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SysPermission(Base):
    __tablename__ = "sys_permission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    permission_code: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    permission_name: Mapped[str] = mapped_column(String(128), nullable=False)
    module: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SysUserRole(Base):
    __tablename__ = "sys_user_role"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("sys_user.id"), nullable=False)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("sys_role.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SysRolePermission(Base):
    __tablename__ = "sys_role_permission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("sys_role.id"), nullable=False)
    permission_id: Mapped[int] = mapped_column(Integer, ForeignKey("sys_permission.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
