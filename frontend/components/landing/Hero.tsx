import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegimeSignalCard } from "@/components/RegimeSignalCard";
import { ErrorState } from "@/components/ErrorState";
import { EvidenceTeaser } from "@/components/landing/EvidenceTeaser";
import type { RegimeResult } from "@/lib/types";

// 히어로 — 좌: 결과중심 헤드라인+단일 CTA+신뢰 마이크로카피, 우: 실제 국면 결론 카드(제품 X-ray).
// 추상 일러스트 대신 '진짜 제품'을 보여준다. 익명=free 응답이라 evidence 는 자연히 잠김.
export function Hero({
  regime,
  isAuthed,
}: {
  regime: RegimeResult | null;
  isAuthed: boolean;
}) {
  return (
    <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-16 pt-14 md:grid-cols-2 md:pt-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-regime-on" aria-hidden />
          실시간 시장 국면 · 한국 특화
        </span>

        <h1 className="mt-5 text-4xl font-semibold leading-[1.15] tracking-tight md:text-5xl">
          DXY를 몰라도,
          <br />
          지금 시장이 어떤 국면인지.
        </h1>

        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          매크로 → 자산배분 → 기업분석. 복잡한 수치 대신{" "}
          <span className="text-foreground">결론을 먼저</span> 보여주고, 그{" "}
          <span className="text-foreground">근거</span>까지 한 곳에서 펼쳐봅니다.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={isAuthed ? "/dashboard" : "/signup"}>
            <Button size="lg" className="gap-2">
              {isAuthed ? "대시보드로 가기" : "무료로 현재 국면 보기"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          {!isAuthed ? (
            <Link href="/login">
              <Button variant="outline" size="lg">
                로그인
              </Button>
            </Link>
          ) : null}
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          실시간 갱신(30분) · 16개 핵심 지표 추적 · 투자조언이 아닙니다
        </p>
      </div>

      {/* 우: 라이브 제품 X-ray — 실제 국면 결론 카드(익명 free) */}
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-regime-on/10 blur-2xl"
          aria-hidden
        />
        {regime ? (
          <RegimeSignalCard data={regime} />
        ) : (
          <ErrorState message="지금은 미리보기를 불러올 수 없습니다. 가입 후 대시보드에서 확인하실 수 있습니다." />
        )}

        {/* 즉시 시연 — 결론(선명)/근거(흐림)로 '결론 무료, 근거 Pro' 를 한 눈에. 정적 데모. */}
        <div className="mt-5">
          <EvidenceTeaser />
        </div>
      </div>
    </section>
  );
}
