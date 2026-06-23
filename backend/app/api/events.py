"""계측(usage events) 라우터 — POST /api/events 로 행동 이벤트를 append-only 적재.

Phase 0 계측 스캐폴드. 설계 원칙:
- fail-open: 기록 실패/미설정이어도 사용자 흐름을 막지 않는다 → 항상 204(No Content).
- 선택적 인증: 토큰 있으면 user_id/tier 를 서버에서 도출, 없으면 익명 이벤트.
- tier 는 클라이언트가 보내지 않는다 — 검증된 profile 에서만 도출(게이팅 일관성).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.auth import SupabaseUser
from app.deps import get_current_user, get_user_tier
from app.models import Tier
from app.supabase_admin import insert_usage_event

router = APIRouter(prefix="/api", tags=["events"])


class EventIn(BaseModel):
    """이벤트 입력 바디. tier 는 받지 않는다(서버에서 도출)."""

    event_type: str = Field(min_length=1, max_length=120)
    payload: dict[str, Any] = Field(default_factory=dict)


@router.post("/events", status_code=204, response_class=Response)
async def record_event(
    body: EventIn,
    user: SupabaseUser | None = Depends(get_current_user),
    tier: Tier = Depends(get_user_tier),
) -> Response:
    """이벤트 기록 시도 후 204. 어떤 실패도 조용히 흡수(fail-open no-op)."""
    user_id = str(user["id"]) if user and user.get("id") else None
    try:
        await insert_usage_event(
            body.event_type,
            payload=body.payload,
            user_id=user_id,
            tier=tier.value,
        )
    except Exception:  # noqa: BLE001 — 계측은 본 흐름을 절대 막지 않는다.
        pass
    return Response(status_code=204)
