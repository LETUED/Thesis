"""FastAPI 앱 부트스트랩 — CORS + 라우터 + 표준 에러 핸들러.

create_app() 팩토리로 앱을 조립한다(테스트/배포에서 동일 인스턴스 재현).
실행: uvicorn app.main:app --reload  (또는 py -m uvicorn ...)
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.billing import router as billing_router
from app.api.events import router as events_router
from app.api.routes import router
from app.config import settings
from app.models import ErrorDetail, ErrorResponse


def _error_payload(code: str, message: str) -> dict:
    return ErrorResponse(error=ErrorDetail(code=code, message=message)).model_dump(
        mode="json"
    )


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description=(
            "투자 판단의 근거를 제공하는 SaaS 백엔드. "
            "결론은 무료, 상세 근거는 Pro. 본 응답은 투자 권유가 아닙니다."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(StarletteHTTPException)
    async def _http_exc(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload("http_error", str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_exc(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_payload("validation_error", str(exc.errors())),
        )

    @app.exception_handler(Exception)
    async def _unhandled_exc(_: Request, exc: Exception) -> JSONResponse:
        # 단정 금지 톤 — 내부 오류도 중립적으로 안내.
        return JSONResponse(
            status_code=500,
            content=_error_payload(
                "internal_error",
                "일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
            ),
        )

    app.include_router(router)
    app.include_router(billing_router)
    app.include_router(events_router)
    return app


app = create_app()
