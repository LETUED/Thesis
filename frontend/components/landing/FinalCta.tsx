import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// 마무리 CTA — 근거중심 톤("근거를 직접 확인하세요"). 재촉·확정수익 금지.
export function FinalCta({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="reveal-up mx-auto max-w-5xl px-4 pb-20 pt-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-card p-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          근거를 직접 확인하세요
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          지금 시장이 어떤 국면인지, 1분이면 충분합니다. 결론은 무료입니다.
        </p>
        <div className="mt-7">
          {/* 게스트도 가입 없이 바로 대시보드(익명 free)로 진입 */}
          <Link href="/dashboard">
            <Button size="lg" className="gap-2">
              {isAuthed ? "대시보드로 가기" : "무료로 현재 국면 보기"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
