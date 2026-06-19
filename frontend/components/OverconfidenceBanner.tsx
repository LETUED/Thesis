import { ShieldAlert } from "lucide-react";

// 과신 방지 상시 배너. 경고 임계값에서도 '매도' 금지 — '리스크가 높아졌습니다' 톤.
export function OverconfidenceBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <ShieldAlert
        className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <p className="text-sm leading-relaxed text-muted-foreground">
        여기에 보이는 결론은{" "}
        <span className="font-medium text-foreground">근거의 모음</span>이며,
        특정 시점에 사거나 팔라는 권유가 아닙니다. 신호가 뚜렷해 보일 때일수록
        한 가지 지표에 과신하지 않도록 주의하세요.
      </p>
    </div>
  );
}
