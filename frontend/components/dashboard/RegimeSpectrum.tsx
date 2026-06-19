import type { RegimeLabel, RegimeResult } from "@/lib/types";

// 시장 국면을 한 줄 스펙트럼으로 표현: 위험 회피(좌) ↔ 중립(중) ↔ 위험 선호(우).
// 결론(label)만으로 위치를 정하며 score 등 raw 수치는 노출하지 않는다.
// 색은 토큰 클래스만, 위치(left%)만 인라인 style 로 허용.

const POSITION_BY_LABEL: Record<RegimeLabel, number> = {
  리스크오프: 18,
  중립: 50,
  리스크온: 82,
};

const ARIA_BY_LABEL: Record<RegimeLabel, string> = {
  리스크오프: "현재 시장 국면은 위험 회피 쪽에 있습니다.",
  중립: "현재 시장 국면은 중립 부근에 있습니다.",
  리스크온: "현재 시장 국면은 위험 선호 쪽에 있습니다.",
};

export function RegimeSpectrum({ data }: { data: RegimeResult }) {
  const { conclusion } = data;
  const left = POSITION_BY_LABEL[conclusion.label];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        시장 국면 스펙트럼
      </p>

      {/* 마커 위: 현재 국면 라벨 (방향을 색과 텍스트로 병기) */}
      <div className="relative mt-6 mb-2 h-5">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap text-sm font-semibold text-foreground"
          style={{ left: `${left}%` }}
        >
          {conclusion.label}
        </span>
      </div>

      {/* 스펙트럼 트랙: 좌(amber) → 중(slate) → 우(emerald) 가로 그라데이션 */}
      <div
        role="img"
        aria-label={ARIA_BY_LABEL[conclusion.label]}
        className="relative h-2.5 rounded-full bg-gradient-to-r from-regime-off/40 via-regime-neutral/40 to-regime-on/40"
      >
        {/* 현재 위치 마커: 세로 바 + 원형 점 */}
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${left}%` }}
          aria-hidden
        >
          <span className="block h-5 w-5 rounded-full border-2 border-card bg-foreground shadow-sm" />
        </span>
      </div>

      {/* 양끝/가운데 라벨 */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="text-regime-off">위험 회피</span>
        <span className="text-regime-neutral">중립</span>
        <span className="text-regime-on">위험 선호</span>
      </div>

      {/* 마커 아래: 결론 헤드라인 (행동 지시 아님, 점검 톤) */}
      <p className="mt-4 text-sm leading-snug text-muted-foreground">
        {conclusion.headline}
      </p>
    </div>
  );
}
