"""결제(구독) 라우터 — Stripe Checkout / 고객포털 / webhook.

철학 정합: tier 는 webhook(검증된 결제 이벤트)으로만 바뀐다. 클라이언트가 보낸
어떤 값도 신뢰하지 않는다. 에러 문구는 단정/'매도' 톤 금지, ErrorResponse 표준.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.auth import SupabaseUser
from app.billing import stripe_service
from app.deps import require_user
from app.models import ErrorDetail, ErrorResponse
from app.supabase_admin import get_stripe_customer_id

router = APIRouter(prefix="/api", tags=["billing"])


class UrlResponse(BaseModel):
    url: str


def _err(status_code: int, code: str, message: str) -> JSONResponse:
    payload = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status_code, content=payload.model_dump(mode="json"))


@router.post("/billing/checkout", response_model=UrlResponse, responses={502: {"model": ErrorResponse}})
async def checkout(user: SupabaseUser = Depends(require_user)) -> UrlResponse | JSONResponse:
    """Pro 구독 결제 페이지(Checkout) URL 발급. 로그인 필요."""
    try:
        url = await run_in_threadpool(
            stripe_service.create_checkout_url, user_id=str(user["id"]), email=user.get("email")
        )
    except Exception as exc:  # noqa: BLE001
        return _err(502, "checkout_unavailable", f"결제 페이지를 일시적으로 열 수 없습니다: {exc}")
    return UrlResponse(url=url)


@router.post("/billing/portal", response_model=UrlResponse, responses={400: {"model": ErrorResponse}})
async def portal(user: SupabaseUser = Depends(require_user)) -> UrlResponse | JSONResponse:
    """구독 관리(취소/카드변경) 고객 포털 URL. 결제 이력이 있어야 함."""
    customer_id = await get_stripe_customer_id(str(user["id"]))
    if not customer_id:
        return _err(400, "no_subscription", "아직 구독 내역이 없습니다. 먼저 구독을 시작해 주세요.")
    try:
        url = await run_in_threadpool(stripe_service.create_portal_url, customer_id=customer_id)
    except Exception as exc:  # noqa: BLE001
        return _err(502, "portal_unavailable", f"구독 관리 페이지를 일시적으로 열 수 없습니다: {exc}")
    return UrlResponse(url=url)


@router.post("/stripe/webhook", response_model=None)
async def webhook(request: Request) -> JSONResponse | dict[str, bool]:
    """Stripe 이벤트 수신 → 서명 검증 → profiles.tier 동기화. 인증 불필요(서명이 인증)."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        event = stripe_service.parse_event(payload, sig)
    except Exception as exc:  # noqa: BLE001 — 서명 불일치 등은 400
        return _err(400, "invalid_webhook", f"webhook 서명 검증 실패: {exc}")
    await stripe_service.handle_event(event)
    return {"received": True}
