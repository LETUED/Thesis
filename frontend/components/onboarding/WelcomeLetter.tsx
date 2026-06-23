"use client";

import * as React from "react";
import Link from "next/link";
import { X, TrendingUp, PieChart, Building2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/ui/panel";

// NN/G 스타일 온보딩 레터 — 첫 방문자에게 THESIS가 무엇인지와 Top-Down 3단계
// (매크로 → 자산배분 → 기업분석)를 따뜻하게 안내한다. localStorage 로 한 번 닫으면
// 다시 노출하지 않는다. 과신 방지 한 줄을 포함 — 판단을 대신하지 않는다는 톤.
// 게스트(isAuthed=false)에겐 '무가입으로 둘러보는 중'임을 알리고 가입을 부드럽게 권한다
// — 강요가 아니라 '저장' 가치를 제시(설계철학: "사세요" 금지, 정보 접근으로 표현).

const DISMISS_KEY = "thesis:welcome:dismissed";

const STEPS = [
  {
    icon: TrendingUp,
    title: "1. 매크로",
    body: "지금 시장이 어떤 국면인지부터 봅니다. 원달러·금리·변동성 같은 큰 흐름이 출발점이에요.",
  },
  {
    icon: PieChart,
    title: "2. 자산배분",
    body: "그 국면에서 위험을 어떻게 나눠 담을지 살펴봅니다. 한 종목에 몰지 않는 균형이 먼저예요.",
  },
  {
    icon: Building2,
    title: "3. 기업분석",
    body: "마지막으로 개별 기업을 들여다봅니다. 큰 그림 위에서 봐야 흔들리지 않아요.",
  },
] as const;

export interface WelcomeLetterProps {
  // 시작하기 CTA 목적지. 기본은 매크로(지표)부터 보도록 /indicators.
  ctaHref?: string;
  // 인증 여부. false(게스트)면 무가입 안내 + 가입 유도 한 줄을 덧붙인다. 기본 true(기존 동작 보존).
  isAuthed?: boolean;
  className?: string;
}

export function WelcomeLetter({
  ctaHref = "/indicators",
  isAuthed = true,
  className,
}: WelcomeLetterProps) {
  // 첫 렌더에서는 숨겨 두고(SSR/하이드레이션 깜빡임 방지), 마운트 후 저장값을 확인한다.
  const [show, setShow] = React.useState(false);
  const headingId = React.useId();

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) !== "1") setShow(true);
    } catch {
      setShow(true); // 스토리지 접근 불가(프라이빗 모드 등) → 일단 보여준다
    }
  }, []);

  function dismiss() {
    setShow(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 저장 실패는 무시 — 현재 세션에서는 닫힌 상태로 유지된다
    }
  }

  if (!show) return null;

  return (
    <Panel
      as="section"
      aria-labelledby={headingId}
      className={cn("relative flex flex-col gap-5", className)}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="환영 안내 닫기"
        title="환영 안내 닫기"
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex flex-col gap-2 pr-10">
        <h2 id={headingId} className="text-lg font-semibold text-foreground">
          THESIS에 오신 걸 환영합니다
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          THESIS는 시장의 큰 흐름부터 개별 기업까지, 같은 순서로 차분히 짚어보도록
          돕는 투자 판단 도구입니다. 한 번에 다 볼 필요는 없어요. 아래 순서대로
          한 걸음씩 따라가 보세요.
        </p>
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex flex-col gap-2">
              <div
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={ctaHref}
          onClick={dismiss}
          className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-on-emphasis transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          시작하기
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
          다음에 볼게요
        </button>
      </div>

      {/* 게스트 전용 — 무가입 상태를 알리고 '저장' 가치로 가입을 부드럽게 권한다(강요·구매 압박 없음). */}
      {!isAuthed ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          지금은 <span className="text-foreground">가입 없이 둘러보는 중</span>
          이에요. 가입하면 관심종목과 자산배분 설정이 저장됩니다.{" "}
          <Link
            href="/signup"
            onClick={dismiss}
            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            무료로 시작
          </Link>
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground" role="note">
        THESIS는 이런 근거들이 있다는 것을 보여줄 뿐, 매수·매도를 권하거나 수익을
        보장하지 않습니다. 모든 판단과 책임은 본인에게 있습니다.
      </p>
    </Panel>
  );
}
