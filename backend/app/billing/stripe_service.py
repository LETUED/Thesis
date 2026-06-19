"""Stripe 구독(테스트 모드) — Checkout / 고객포털 / webkook 처리.

설계:
- 결제 성공/변경은 webhook 으로만 tier 를 바꾼다(클라이언트 신뢰 금지).
- tier 갱신은 supabase_admin.set_user_tier 한 곳으로 — 포트원도 동일 함수 재사용.
- stripe 라이브러리 호출은 동기(블로킹) → 라우트에서 run_in_threadpool 로 감싼다.
"""

from __future__ import annotations

import json
from typing import Any

import stripe

from app.config import settings
from app.supabase_admin import get_user_id_by_stripe_customer, set_user_tier


def _ensure_key() -> None:
    if not settings.stripe_secret_key:
        raise RuntimeError("STRIPE_SECRET_KEY 미설정")
    stripe.api_key = settings.stripe_secret_key


def create_checkout_url(*, user_id: str, email: str | None) -> str:
    """Pro 구독 Checkout 세션 생성 → 결제 페이지 URL.

    client_reference_id 로 우리 user_id 를 실어 webhook 에서 매칭한다.
    """
    _ensure_key()
    if not settings.stripe_price_pro:
        raise RuntimeError("STRIPE_PRICE_PRO 미설정")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": settings.stripe_price_pro, "quantity": 1}],
        success_url=settings.billing_success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=settings.billing_cancel_url,
        client_reference_id=user_id,
        customer_email=email or None,
        metadata={"user_id": user_id},
        allow_promotion_codes=True,
    )
    return session.url


def create_portal_url(*, customer_id: str) -> str:
    """고객 포털(구독 취소/카드 변경) URL."""
    _ensure_key()
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=settings.billing_cancel_url.replace("/cancel", "/manage"),
    )
    return session.url


def parse_event(payload: bytes, sig_header: str | None) -> dict[str, Any]:
    """webhook 서명만 검증하고 원본 JSON 을 플레인 dict 로 반환.

    stripe v15 의 construct_event 는 StripeObject(.get() 미지원, v2 이벤트 분기)를
    돌려줘 다루기 번거롭다. 서명 검증(verify_header)과 파싱을 분리해 단순화한다.
    서명 불일치 시 SignatureVerificationError → 라우트가 400 처리.
    """
    if not settings.stripe_webhook_secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET 미설정")
    # verify_header 는 str 페이로드를 기대한다(bytes 면 서명 문자열이 어긋남).
    raw = payload.decode("utf-8") if isinstance(payload, (bytes, bytearray)) else payload
    stripe.WebhookSignature.verify_header(
        raw, sig_header or "", settings.stripe_webhook_secret, tolerance=300
    )
    return json.loads(raw)


async def handle_event(event: dict[str, Any]) -> None:
    """관심 이벤트만 처리해 profiles.tier 를 동기화한다."""
    etype = event.get("type")
    obj: dict[str, Any] = (event.get("data") or {}).get("object") or {}

    if etype == "checkout.session.completed":
        user_id = obj.get("client_reference_id") or (obj.get("metadata") or {}).get("user_id")
        customer_id = obj.get("customer")
        if user_id:
            await set_user_tier(
                str(user_id), "pro",
                stripe_customer_id=str(customer_id) if customer_id else None,
                subscription_status="active",
            )

    elif etype in ("customer.subscription.updated", "customer.subscription.created"):
        customer_id = obj.get("customer")
        status = obj.get("status")  # active, trialing, past_due, canceled, unpaid...
        user_id = await get_user_id_by_stripe_customer(str(customer_id)) if customer_id else None
        if user_id:
            tier = "pro" if status in ("active", "trialing") else "free"
            await set_user_tier(user_id, tier, subscription_status=str(status) if status else None)

    elif etype == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        user_id = await get_user_id_by_stripe_customer(str(customer_id)) if customer_id else None
        if user_id:
            await set_user_tier(user_id, "free", subscription_status="canceled")
