"""FastAPI 의존성 주입 지점.

get_collector 는 프로세스 단일 캐시를 돌려준다.
인증/Pro 게이팅: get_current_user(선택적 인증) → require_user(강제) → get_user_tier.
tier 는 절대 클라이언트가 보내지 않는다 — 검증된 user 의 profiles.tier 로만 도출한다.
"""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException

from app.auth import SupabaseUser, fetch_tier, verify_token
from app.config import settings
from app.data.collector import InMemoryTTLCache
from app.models import Tier

# 프로세스 수명 동안 공유되는 단일 캐시(30분 TTL). 라우트 간 스냅샷 재사용.
_cache = InMemoryTTLCache(default_ttl_sec=settings.cache_ttl_seconds)


def get_collector() -> InMemoryTTLCache:
    return _cache


def _extract_bearer(authorization: str | None) -> str | None:
    """Authorization 헤더에서 Bearer 토큰만 추출. 형식 불일치면 None."""
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].strip():
        return parts[1].strip()
    return None


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> SupabaseUser | None:
    """선택적 인증. 토큰 없거나 검증 실패 시 None(=익명 free).

    결론=무료 철학: 토큰이 없다고 401 을 던지지 않는다. 익명 접근을 허용한다.
    """
    token = _extract_bearer(authorization)
    if token is None:
        return None
    return await verify_token(token)


async def require_user(
    user: SupabaseUser | None = Depends(get_current_user),
) -> SupabaseUser:
    """강제 인증. 미인증이면 401(단정/'매도' 톤 금지)."""
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="로그인이 필요한 기능입니다. 로그인 후 다시 시도해 주세요.",
        )
    return user


async def get_user_tier(
    user: SupabaseUser | None = Depends(get_current_user),
) -> Tier:
    """검증된 user → profiles.tier. 익명/조회실패 시 FREE(fail-closed)."""
    if user is None:
        return Tier.FREE
    uid = user.get("id")
    if not uid:
        return Tier.FREE
    tier_str = await fetch_tier(str(uid))
    return Tier.PRO if tier_str == "pro" else Tier.FREE
