// Pro 잠금 지점별 업셀 카피 단일출처. 과신 방지 톤 — '사세요'·'지금 매수' 금지.
// "근거를 펼쳐본다 / 더 깊이 본다" 식으로, 행동 강요가 아닌 정보 접근으로 표현한다.

export type UpsellSource =
  | "evidence_regime"
  | "evidence_allocation"
  | "indicators_detail"
  | "lab_block"
  | "company_financials"
  | "alerts"
  | "watchlist_limit";

export interface UpsellCopy {
  title: string;
  body: string;
}

// 업셀 모달 과신 방지 고지 — 결제 유도가 면책을 가리지 않도록 항상 동반한다.
// '사세요'·'Pro면 더 잘 산다' 류 금지: 더 많은 정보 접근일 뿐 판단을 대신하지 않는다.
export const UPSELL_DISCLAIMER =
  "Pro는 더 많은 근거와 상세 데이터에 대한 접근을 제공할 뿐, 매수·매도 판단을 대신하거나 수익을 보장하지 않습니다. 모든 투자 결정과 책임은 본인에게 있습니다.";

export const UPSELL_COPY: Record<UpsellSource, UpsellCopy> = {
  evidence_regime: {
    title: "이 판단의 근거 지표 보기",
    body: "어떤 지표가 국면 신호에 얼마나 기여했는지, 기여도와 임계값을 Pro에서 펼쳐 확인할 수 있습니다.",
  },
  evidence_allocation: {
    title: "자산배분 산출 근거 보기",
    body: "현재 국면·한국 신호·제약 조건이 배분 비중에 어떻게 반영됐는지 Pro에서 단계별로 확인할 수 있습니다.",
  },
  indicators_detail: {
    title: "지표 상세 펼쳐보기",
    body: "기본 3개 외 전체 지표의 추세·임계값·실시간 수치를 Pro에서 확인할 수 있습니다.",
  },
  lab_block: {
    title: "분석 블록 더 쓰기",
    body: "조립 분석 캔버스의 고급 블록과 저장·공유 기능을 Pro에서 사용할 수 있습니다.",
  },
  company_financials: {
    title: "기업 재무 전체 보기",
    body: "수익성·성장성·재무건전성 지표 전체와 동종 비교를 Pro에서 확인할 수 있습니다.",
  },
  alerts: {
    title: "임계값 알림 받기",
    body: "관심 지표가 경계 구간에 들어설 때 알림을 받는 기능을 Pro에서 설정할 수 있습니다.",
  },
  watchlist_limit: {
    title: "관심종목 더 담기",
    body: "Free는 관심종목 1개까지입니다. Pro에서는 관심종목을 제한 없이 담아 한곳에서 추적할 수 있습니다.",
  },
};
