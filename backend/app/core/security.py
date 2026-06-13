"""安全工具：密码哈希和JWT令牌管理"""
from __future__ import annotations

import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings

# PBKDF2-HMAC-SHA256 参数
_HASH_ITERATIONS = 600_000
_HASH_SALT_BYTES = 16
_HASH_DIGEST_BYTES = 32
_HASH_SEPARATOR = "$"


def hash_password(plain: str) -> str:
    """对明文密码进行PBKDF2-SHA256哈希处理，返回 salt$iterations$digest_hex 格式"""
    salt = os.urandom(_HASH_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        plain.encode("utf-8"),
        salt,
        _HASH_ITERATIONS,
        dklen=_HASH_DIGEST_BYTES,
    )
    return f"{salt.hex()}{_HASH_SEPARATOR}{_HASH_ITERATIONS}{_HASH_SEPARATOR}{digest.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    """校验明文密码与存储的PBKDF2哈希值是否匹配"""
    # 兼容旧的明文演示密码
    if not hashed or _HASH_SEPARATOR not in hashed:
        # 旧格式：纯文本或简单哈希，直接比较
        return plain == hashed

    try:
        salt_hex, iterations_str, digest_hex = hashed.split(_HASH_SEPARATOR, 2)
        salt = bytes.fromhex(salt_hex)
        iterations = int(iterations_str)
    except (ValueError, TypeError):
        return False

    expected = hashlib.pbkdf2_hmac(
        "sha256",
        plain.encode("utf-8"),
        salt,
        iterations,
        dklen=len(bytes.fromhex(digest_hex)),
    )
    return expected.hex() == digest_hex


def create_access_token(username: str, user_id: int, role: str) -> tuple[str, str]:
    """创建JWT访问令牌，返回 (token, jti)"""
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "user_id": user_id,
        "role": role,
        "jti": jti,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, jti


def decode_access_token(token: str) -> dict:
    """解码并验证JWT令牌，返回payload字典"""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
