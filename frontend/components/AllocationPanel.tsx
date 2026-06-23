"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AllocationDonut } from "@/components/AllocationDonut";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { EvidenceLocked } from "@/components/EvidenceLocked";
import { ConclusionCard } from "@/components/conclusion/ConclusionCard";
import { Chip } from "@/components/ui/chip";
import { BulletRow } from "@/components/ui/viz/bullet-row";
import { m } from "motion/react";
import { ApiError, postAllocation } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { EMOTION_LABELS } from "@/lib/emotion";
import { buildConstraintBullets } from "@/lib/allocation";
import {
  isLocked,
  type AllocationResult,
  type InvestmentHorizon,
  type RiskTolerance,
  type Tier,
} from "@/lib/types";

// 현재 폼 설정(저장 규칙 배선용). 부모 island 가 mirror 해 SaveRuleButton 에 넘긴다.
export interface AllocationSettings {
  risk_tolerance: RiskTolerance;
  horizon: InvestmentHorizon;
  reflect_current_regime: boolean;
}

const HORIZONS: { value: InvestmentHorizon; label: string; hint: string }[] = [
  { value: "short", label: "단기", hint: "1년 미만" },
  { value: "mid", label: "중기", hint: "1~3년" },
  { value: "long", label: "장기", hint: "3년 이상" },
];

export function AllocationPanel({
  tier,
  onSettingsChange,
}: {
  tier: Tier;
  // 현재 폼 설정이 바뀔 때 부모에 알림(선택). 저장 규칙 배선용 — 미지정 시 무동작.
  onSettingsChange?: (settings: AllocationSettings) => void;
}) {
  const [horizon, setHorizon] = useState<InvestmentHorizon>("mid");
  const [riskIndex, setRiskIndex] = useState(2); // moderate
  const [result, setResult] = useState<AllocationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const risk = EMOTION_LABELS[riskIndex] ?? EMOTION_LABELS[2]!;

  useEffect(() => {
    onSettingsChange?.({
      risk_tolerance: risk.value,
      horizon,
      reflect_current_regime: true,
    });
  }, [risk.value, horizon, onSettingsChange]);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        // 로그인 토큰을 실어 백엔드가 검증된 tier 로 evidence 게이팅하게 한다.
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await postAllocation(
          {
            risk_tolerance: risk.value,
            horizon,
            reflect_current_regime: true,
            tier,
          },
          session?.access_token,
        );
        setResult(res);
      } catch (e) {
        setError(
          e instanceof ApiError
            ? e.message
            : "일시적으로 배분안을 제공할 수 없습니다.",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          자산배분
        </p>
        <CardTitle className="mt-1 text-lg">
          나에게 맞는 비중을 살펴봅니다
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 투자기간 3버튼 세그먼트 */}
        <div>
          <p className="mb-2 text-sm font-medium">투자 기간</p>
          <div className="grid grid-cols-3 gap-2">
            {HORIZONS.map((h) => {
              const active = h.value === horizon;
              return (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setHorizon(h.value)}
                  className={
                    "rounded-md border px-3 py-2 text-center transition-colors " +
                    (active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:bg-muted")
                  }
                >
                  <span className="block text-sm font-medium">{h.label}</span>
                  <span
                    className={
                      "block text-xs " +
                      (active ? "text-background/70" : "text-muted-foreground")
                    }
                  >
                    {h.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 리스크 허용도 5단계 감정 슬라이더 */}
        <div>
          <p className="mb-2 text-sm font-medium">투자 성향</p>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={riskIndex}
            onChange={(e) => setRiskIndex(Number(e.target.value))}
            className="w-full accent-foreground"
            aria-label="투자 성향"
            aria-valuetext={risk.headline}
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            {EMOTION_LABELS.map((l) => (
              <span key={l.value}>{l.short}</span>
            ))}
          </div>
          <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
            “{risk.headline}”
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "살펴보는 중..." : "근거 살펴보기"}
        </Button>

        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : null}

        {/* 빈 상태(아직 미실행): 입문자가 다음 행동을 알도록 안내(검증 지적) */}
        {!result && !error && !isPending ? (
          <p className="text-sm text-muted-foreground">
            투자 기간과 성향을 고른 뒤 “근거 살펴보기”를 누르면 배분안이
            나타납니다.
          </p>
        ) : null}

        {/* 결과 */}
        {result ? (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="border-t border-border pt-5"
          >
            <ConclusionCard
              eyebrow="자산배분 결론"
              headline={result.conclusion.headline}
            >
              <AllocationDonut
                mix={result.conclusion.mix}
                centerText={result.conclusion.risk_label_text}
              />

              {result.conclusion.sector_tilts_summary.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.conclusion.sector_tilts_summary.map((s, i) => (
                    <Chip key={`${s}-${i}`} variant="muted">
                      {s}
                    </Chip>
                  ))}
                </div>
              ) : null}

              {/* 제약 대비 시각화: 현금 최소 20%·단일종목 최대 15% 를 mix 값으로 점검 */}
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium">분산 제약 점검</p>
                {buildConstraintBullets(result.conclusion.mix).map((b) => (
                  <div key={b.key} className="space-y-1">
                    <BulletRow
                      label={b.label}
                      value={b.value}
                      threshold={b.threshold}
                      tier={result.tier}
                      status={b.status}
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {b.caption}
                    </p>
                  </div>
                ))}
              </div>

              {result.evidence === null ? null : isLocked(result.evidence) ? (
                <EvidenceLocked data={result.evidence} />
              ) : (
                <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4 text-xs">
                  {result.evidence.regime_reasons.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium">국면 근거</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {result.evidence.regime_reasons.map((r, i) => (
                          <li key={i}>· {r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {result.evidence.korea_signals.length > 0 ? (
                    <div>
                      <p className="mb-1 font-medium">한국 시장 신호</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {result.evidence.korea_signals.map((r, i) => (
                          <li key={i}>· {r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              <DisclaimerBanner text={result.disclaimer} />
            </ConclusionCard>
          </m.div>
        ) : null}
      </CardContent>
    </Card>
  );
}
