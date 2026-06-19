"""Supabase 관리(service_role) 호출 — profiles.tier 를 갱신하는 단일 지점.

PG 무관 설계의 핵심: Stripe webhook 이든 포트원(한국 PG) 이든, 결제 성공 시
여기 set_user_tier 만 호출하면 게이팅(이미 tier 만 봄)이 그대로 작동한다.
service_role(SECRET_KEY) 는 RLS 를 우회하므로 tier 승급이 가능하다(서버 전용).
"""

from __future__ import annotations

from typing import Any

import httpx

from app.auth import invalidate_tier_cache
from app.config import settings

_HTTP_TIMEOUT = 8.0


def _admin_headers() -> dict[str, str]:
    return {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
        "Content-Type": "application/json",
    }


def _configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_secret_key)


async def set_user_tier(
    user_id: str,
    tier: str,
    *,
    stripe_customer_id: str | None = None,
    subscription_status: str | None = None,
) -> bool:
    """profiles 행의 tier(및 결제 메타)를 갱신. 성공 여부 반환.

    tier 는 'free'/'pro' 만 허용(스키마 CHECK 와 일치). 결제 메타는 주어진 것만 갱신.
    """
    if not _configured() or not user_id or tier not in ("free", "pro"):
        return False

    payload: dict[str, Any] = {"tier": tier}
    if stripe_customer_id is not None:
        payload["stripe_customer_id"] = stripe_customer_id
    if subscription_status is not None:
        payload["subscription_status"] = subscription_status

    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/profiles"
    params = {"id": f"eq.{user_id}"}
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.patch(
                url, params=params, headers={**_admin_headers(), "Prefer": "return=minimal"}, json=payload
            )
        ok = resp.status_code in (200, 204)
        if ok:
            invalidate_tier_cache(user_id)  # 승급/취소 즉시 반영
        return ok
    except httpx.HTTPError:
        return False


async def get_user_id_by_stripe_customer(customer_id: str) -> str | None:
    """stripe_customer_id 로 profiles.id 역조회. webhook 의 subscription 이벤트용."""
    if not _configured() or not customer_id:
        return None
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/profiles"
    params = {"stripe_customer_id": f"eq.{customer_id}", "select": "id"}
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=_admin_headers())
        if resp.status_code == 200:
            rows = resp.json()
            if isinstance(rows, list) and rows:
                return str(rows[0].get("id")) or None
    except (httpx.HTTPError, ValueError):
        return None
    return None


async def get_stripe_customer_id(user_id: str) -> str | None:
    """user 의 저장된 stripe_customer_id 조회(고객 포털 진입용)."""
    if not _configured() or not user_id:
        return None
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/profiles"
    params = {"id": f"eq.{user_id}", "select": "stripe_customer_id"}
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=_admin_headers())
        if resp.status_code == 200:
            rows = resp.json()
            if isinstance(rows, list) and rows:
                return rows[0].get("stripe_customer_id")
    except (httpx.HTTPError, ValueError):
        return None
    return None
