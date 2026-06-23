import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { ProBadge } from "@/components/ui/pro-badge";
import { BlurTeaser } from "@/components/ui/blur-teaser";
import { cn } from "@/lib/utils/cn";

// 랜딩 즉시 시연 — "결론은 무료, 근거는 Pro" 를 한 카드 안에서 보여준다.
// 결론(정성 평결)은 선명히, 그 아래 근거 영역은 BlurTeaser 로 형태만 노출(raw 수치 절대 없음).
// 정적 데모 — 실데이터 호출 없음. 특정 종목 매수 권유 아님.

// 흐림 뒤에 들어갈 "형태"만 담은 스켈레톤. 라벨/막대 글리프뿐, 숫자·값은 일절 없음.
function EvidenceShapes() {
  const rows = [
    { label: "w-20", bar: "w-3/4" },
    { label: "w-16", bar: "w-1/2" },
    { label: "w-24", bar: "w-2/3" },
  ];
  return (
    <div className="space-y-3 p-4">
      {rows.map((row, i) => (
        <div key={i} className="space-y-1.5">
          <div className={cn("h-2.5 rounded bg-foreground/20", row.label)} />
          <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
            <div className={cn("h-full rounded-full bg-foreground/30", row.bar)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EvidenceTeaser() {
  return (
    <Panel className="p-5">
      {/* 결론 — 무료, 선명 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">현재 국면</p>
          <p className="mt-1 text-lg font-semibold leading-snug text-foreground">
            지금은 변동성 경계 국면
          </p>
        </div>
        <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-status-warn" aria-hidden />
          경계
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        매도 신호는 아닙니다. 다만 방어 비중을 점검해 둘 만한 신호들이 모이고
        있습니다.
      </p>

      {/* 근거 — Pro, 흐림(형태만) */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            이 결론의 근거
          </span>
          <ProBadge />
        </div>
        <BlurTeaser
          label="근거 지표 잠금"
          summary={["핵심 지표 3개 · 추세 그래프"]}
          onUnlock={
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              근거 펼쳐보기
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        >
          <EvidenceShapes />
        </BlurTeaser>
      </div>
    </Panel>
  );
}
