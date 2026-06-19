// 백엔드 FastAPI(http://localhost:8000) 호출 래퍼.
// 표준 ErrorResponse({ error: { code, message } }) 를 파싱해 ApiError 로 throw.

import type {
  AllocationRequest,
  AllocationResult,
  CompanyDirectoryEntry,
  CompanyFundamentals,
  ErrorResponse,
  HealthResponse,
  Layer,
  MarketSnapshot,
  RegimeResult,
  Tier,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;

  constructor(
    code: string,
    message: string,
    status: number,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error: unknown }).error === "object" &&
    (value as { error: unknown }).error !== null
  );
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      // 서버 컴포넌트 프리페치 시에도 항상 최신 데이터를 받도록 캐시 비활성.
      cache: "no-store",
    });
  } catch {
    // 네트워크 단절 — 단정하지 않는 중립 톤 메시지.
    throw new ApiError(
      "network_error",
      "데이터 서버에 연결할 수 없습니다.",
      0,
    );
  }

  if (!res.ok) {
    let code = "http_error";
    let message = "일시적으로 데이터를 제공할 수 없습니다.";
    let requestId: string | null = null;
    try {
      const body: unknown = await res.json();
      if (isErrorResponse(body)) {
        code = body.error.code;
        message = body.error.message;
        requestId = body.error.request_id ?? null;
      }
    } catch {
      // 본문 파싱 실패 — 기본 메시지 유지.
    }
    throw new ApiError(code, message, res.status, requestId);
  }

  return (await res.json()) as T;
}

// 로그인 사용자의 access_token 을 실으면 백엔드가 검증된 tier(Pro 포함)를 적용한다.
// 토큰이 없으면 백엔드는 익명 free 로 처리한다(결론=무료 철학).
function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health");
}

// 조립 분석(/lab) 기업 재무 — 한국=DART, 미국·시세=yfinance, 실패 시 mock 폴백(source 로 가시화).
export function getCompanies(): Promise<CompanyFundamentals[]> {
  return apiFetch<CompanyFundamentals[]>("/api/companies");
}

// 기업 검색 디렉토리 — 한국=DART 전 상장사, 미국=주요 종목(식별자만, 재무 없음).
export function searchCompaniesApi(
  q: string,
  limit = 30,
): Promise<CompanyDirectoryEntry[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch<CompanyDirectoryEntry[]>(
    `/api/companies/search?${params.toString()}`,
  );
}

// 단일 종목 펀더멘털 온디맨드 조회(검색 결과 선택/저장 그래프 복원 시).
export function getCompanyById(id: string): Promise<CompanyFundamentals> {
  return apiFetch<CompanyFundamentals>(
    `/api/company?id=${encodeURIComponent(id)}`,
  );
}

export function getRegime(tier: Tier, accessToken?: string): Promise<RegimeResult> {
  return apiFetch<RegimeResult>(`/api/regime?tier=${tier}`, {
    headers: authHeader(accessToken),
  });
}

export function postAllocation(
  body: AllocationRequest,
  accessToken?: string,
): Promise<AllocationResult> {
  return apiFetch<AllocationResult>("/api/allocation", {
    method: "POST",
    body: JSON.stringify(body),
    headers: authHeader(accessToken),
  });
}

export interface UrlResponse {
  url: string;
}

// 구독 결제 페이지(Checkout) URL — 로그인 필요.
export function createCheckout(accessToken: string): Promise<UrlResponse> {
  return apiFetch<UrlResponse>("/api/billing/checkout", {
    method: "POST",
    headers: authHeader(accessToken),
  });
}

// 구독 관리(취소/카드변경) 고객 포털 URL — 결제 이력 필요.
export function createPortal(accessToken: string): Promise<UrlResponse> {
  return apiFetch<UrlResponse>("/api/billing/portal", {
    method: "POST",
    headers: authHeader(accessToken),
  });
}

export function getIndicators(
  tier: Tier,
  layer?: Layer,
  accessToken?: string,
): Promise<MarketSnapshot> {
  const params = new URLSearchParams({ tier });
  if (layer) params.set("layer", layer);
  return apiFetch<MarketSnapshot>(`/api/indicators?${params.toString()}`, {
    headers: authHeader(accessToken),
  });
}
