# THESIS Backend

투자 판단의 **근거를 제공**하는 SaaS의 FastAPI 백엔드 코어.

> 이 서비스는 "지금 사세요"라고 말하지 않습니다.
> Top-Down(매크로 → 자산배분 → 기업분석) 순서로 **"이런 근거들이 있습니다"** 를 보여줄 뿐,
> 최종 판단과 책임은 투자자 본인에게 있습니다.

---

## 1. 요구 환경

| 항목 | 값 |
| --- | --- |
| OS | Windows 10 |
| Python | 3.13 |
| 실행 커맨드 | `py` (python 아님) |

---

## 2. 설치 (Windows / `py` 기준)

PowerShell에서 백엔드 루트(`backend\`)로 이동한 뒤:

```powershell
# 1) 가상환경 생성
py -m venv .venv

# 2) 활성화 (PowerShell)
.\.venv\Scripts\Activate.ps1
#   cmd.exe 라면:  .\.venv\Scripts\activate.bat

# 3) 의존성 설치
py -m pip install --upgrade pip
py -m pip install -r requirements.txt

# 4) 환경변수 파일 준비 (선택 — 미설정 시 기본값 사용)
Copy-Item .env.example .env
```

> PowerShell 실행 정책 때문에 활성화 스크립트가 막히면:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` 후 다시 활성화.

---

## 3. 실행

```powershell
# 개발 서버 (자동 리로드)
uvicorn app.main:app --reload

# 포트/호스트 지정 예시
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- 기본 주소: `http://127.0.0.1:8000`
- 대화형 문서(Swagger): `http://127.0.0.1:8000/docs`
- 스키마(OpenAPI): `http://127.0.0.1:8000/openapi.json`

---

## 4. 엔드포인트

모든 응답에는 매수·매도 권유가 아님을 못 박는 `disclaimer` 필드가 **항상** 포함됩니다.

| 메서드 | 경로 | 설명 | 주요 쿼리/바디 |
| --- | --- | --- | --- |
| `GET` | `/health` | 헬스 체크 | — |
| `GET` | `/regime` | 시장 국면(리스크온/중립/리스크오프) 분류 | `tier=free\|pro` |
| `POST` | `/allocation` | 리스크 허용도·투자기간 기반 자산배분 제안 | body: `AllocationRequest` |
| `GET` | `/indicators` | 16티커 시장 스냅샷 | `tier=free\|pro`, `layer=L1\|L2\|L3\|L4` |

### tier 게이팅 (MVP)

- `tier` 는 **쿼리 파라미터**로만 동작합니다. 인증 경계는 아직 없습니다(데모용).
- `free`: 결론(conclusion)과 방향성만 노출. 상세 근거(evidence)는 잠금 placeholder.
- `pro`: 점수·기여도·레이어 분해 등 상세 근거까지 노출.
- 실제 인증 의존성은 `app/deps.py` 에 후속 삽입 지점만 비워 두었습니다.

### 호출 예시

```powershell
# 국면 (무료)
curl "http://127.0.0.1:8000/regime?tier=free"

# 국면 (Pro — 상세 근거 포함)
curl "http://127.0.0.1:8000/regime?tier=pro"

# 한국 매크로 레이어만
curl "http://127.0.0.1:8000/indicators?tier=pro&layer=L2"

# 자산배분 제안
curl -X POST "http://127.0.0.1:8000/allocation" `
  -H "Content-Type: application/json" `
  -d '{"risk_tolerance":"moderate","horizon":"mid"}'
```

---

## 5. 외국인 순매수 수급 — 한계 (정직성 명시)

> **외국인 순매수 데이터는 현재 제공하지 않습니다.**

- 한국 거래소의 외국인 순매수/순매도 수급은 **yfinance로 직접 가져올 수 없습니다.**
- 가짜 숫자를 만들어 넣지 않습니다. 대신 인터페이스만 존재하는 **stub** 으로 처리합니다.
  - `get_foreign_flow_stub()` 는 `ForeignFlowStub(available=False)` 를 반환합니다.
- regime / allocation 엔진은 이 데이터가 없으면:
  - 해당 지표를 **가중치 재정규화로 제외**하고,
  - evidence 에 "외국인 수급 데이터 미수집"임을 **명시**합니다(coverage 추적).
- 향후 KRX/데이터 벤더 연동 시 이 stub 인터페이스만 교체하면 됩니다.

---

## 6. 설계 철학이 코드에 반영된 방식

| # | 철학 | 코드/스키마 강제 지점 |
| --- | --- | --- |
| 1 | **"지금 사세요" 금지** | 모든 응답에 필수 `disclaimer: str`. `Disclaimer.is_advice` 는 `Literal[False]` 로 스키마 차원 고정. |
| 2 | **Top-Down 순서 고정** | `Layer` enum 값(L1<L2<L3<L4)을 정렬 키로 사용. `MarketSnapshot` 은 레이어 오름차순 정렬 강제. |
| 3 | **결론 먼저, 근거는 펼쳐보기** | `RegimeResult = conclusion(무료) + evidence(Pro 게이팅) + confidence`. |
| 4 | **감정 언어 리스크 허용도** | 표준편차 대신 5단계 라벨 + 한국어 감정 문구(`risk_label_text`: "-20% 빠지면 잠 못 잔다" 류). |
| 5 | **과신 방지** | 경고 임계값 도달해도 '매도' 라벨 없음. `RegimeLabel` 은 리스크온/중립/리스크오프뿐. `confidence` 는 확률적 라벨(weak/moderate/strong). |
| 6 | **결론 무료 / 근거 유료** | 필드 `json_schema_extra={'tier':'free'\|'pro'}` 메타 + evidence 모델 게이팅(`EvidenceLocked` placeholder / None 치환). |
| 7 | **한국 특화** | `config.py` 에서 L2(한국 매크로) 레이어 가중치 최고(1.6). 원달러·코스피가 1순위. 외국인 수급은 정직하게 stub. |

### 임계값은 전부 config 에 모음 (하드코딩 금지)

- 매직넘버의 단일 출처는 `app/config.py` 입니다.
  - `RegimeConfig`: 컷오프 ±25, `min_coverage` 0.5, 레이어 가중치, 지표 규칙 9개.
  - `AllocationConfig`: 현금 최소 20%, 단일 종목 최대 15%, 5x3 기초 매트릭스, regime 틸트, 한국 디리스킹 임계값, 감정 문구.
- 모든 값은 `THESIS_` prefix 환경변수로 오버라이드 가능(중첩은 `__` 구분자). `.env.example` 참고.

### 견고성 / 캐시

- yfinance 호출은 동기 함수이며, 라우터에서는 threadpool 로 감싸 이벤트 루프 블로킹을 피합니다.
- 네트워크 실패에 견고: 타임아웃 + 예외 처리 + **부분 실패 허용**(`MarketSnapshot.partial` / `failed_symbols` 로 가시화).
- 캐시는 in-memory TTL(기본 30분). Redis 는 `CacheBackend` Protocol 인터페이스만 열어 둔 상태(후속 교체 여지).
- coverage 가 `min_coverage`(0.5) 미만이면 국면은 **중립 + weak confidence** 로 강제(과신 방지 가드).

---

## 7. 디렉터리 구조

```
backend/
├─ app/
│  ├─ __init__.py
│  ├─ config.py        # 모든 임계값/가중치/캐시TTL 단일 출처
│  ├─ tickers.py       # 16티커 → 레이어/한글명 매핑
│  ├─ models.py        # Pydantic v2 응답 모델 (tier 게이팅 스키마)
│  ├─ collector.py     # yfinance 수집 + TTL 캐시 + 외국인 수급 stub
│  ├─ regime.py        # 시장 국면 분류 엔진
│  ├─ allocation.py    # 자산배분 엔진
│  ├─ deps.py          # FastAPI 의존성(캐시 싱글톤; 인증 삽입 지점)
│  ├─ routes.py        # 라우터
│  └─ main.py          # create_app() 팩토리
├─ requirements.txt
├─ .env.example
└─ README.md
```
