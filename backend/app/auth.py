"""Supabase Bearer 토큰 검증 — 원격 검증(/auth/v1/user) + 짧은 TTL 캐시.

설계 철학:
- tier 는 절대 클라이언트가 보내지 않는다. 여기서 검증한 user 의 profiles.tier 로만 도출.
- 검증 실패/설정 누락 시 단정 톤 금지. 익명(free) 으로 안전 폴백(fail-closed: Pro 미부여).
- 매 요청 Supabase 왕복 비용을 줄이기 위해 동일 토큰을 짧은 TTL(60초) 로 캐시.
"""

from __future__ import annotations

import hashlib
import time
from typing import Any

import httpx

from app.config import settings

__all__ = [
    "verify_token",
    "fetch_tier",
    "invalidate_tier_cache",
    "SupabaseUser",
]

# (user_dict, expires_at) — 토큰 해시 키. 짧은 TTL 로 중복 원격검증 완화.
_token_cache: dict[str, tuple[dict[str, Any] | None, float]] = {}
_TOKEN_TTL_SEC = 60.0

# tier 캐시: uid -> (tier, expires_at). profiles 조회 왕복 완화.
_tier_cache: dict[str, tuple[str, float]] = {}
_TIER_TTL_SEC = 60.0

_HTTP_TIMEOUT = 6.0


SupabaseUser = dict[str, Any]


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _supabase_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_publishable_key)


async def verify_token(token: str) -> SupabaseUser | None:
    """Bearer 토큰을 GET {SUPABASE_URL}/auth/v1/user 로 검증.

    Returns:
        성공 시 user dict({id,email,...}), 실패/미설정 시 None.
        None 은 '익명 free' 로 처리되며 401 을 강제하지 않는다(결론=무료 철학).
    """
    if not token or not _supabase_configured():
        return None

    key = _hash(token)
    now = time.monotonic()
    cached = _token_cache.get(key)
    if cached is not None and cached[1] > now:
        return cached[0]

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_publishable_key,
    }
    user: SupabaseUser | None = None
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            # Supabase 는 user 객체를 그대로 반환(id/email 등 포함).
            if isinstance(data, dict) and data.get("id"):
                user = data
    except (httpx.HTTPError, ValueError):
        # 네트워크/파싱 실패 → 안전 폴백(익명). 단정 에러 던지지 않음.
        user = None

    _token_cache[key] = (user, now + _TOKEN_TTL_SEC)
    return user


def invalidate_tier_cache(user_id: str) -> None:
    """결제 승급/취소 직후 tier 캐시를 비워 즉시 반영(60초 TTL 우회)."""
    _tier_cache.pop(user_id, None)


async def fetch_tier(user_id: str) -> str:
    """profiles.tier 를 service_role(SECRET_KEY) 로 조회. 실패 시 'free'.

    RLS 우회를 위해 SECRET_KEY 를 쓰며, 이는 서버 전용이다(프론트 노출 금지).
    fail-closed: 조회 불가/오류/미존재 시 'free' 로 안전 강등(Pro 거저 주지 않음).
    """
    if not user_id or not settings.supabase_url or not settings.supabase_secret_key:
        return "free"

    now = time.monotonic()
    cached = _tier_cache.get(user_id)
    if cached is not None and cached[1] > now:
        return cached[0]

    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/profiles"
    params = {"id": f"eq.{user_id}", "select": "tier"}
    headers = {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
    }
    tier = "free"
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=headers)
        if resp.status_code == 200:
            rows = resp.json()
            if isinstance(rows, list) and rows:
                candidate = rows[0].get("tier")
                if candidate in ("free", "pro"):
                    tier = candidate
    except (httpx.HTTPError, ValueError):
        tier = "free"

    _tier_cache[user_id] = (tier, now + _TIER_TTL_SEC)
    return tier
