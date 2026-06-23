import { NoticeBanner } from "@/components/ui/notice-banner";

// 과신 방지 상시 배너. 경고 임계값에서도 '매도' 금지 — '리스크가 높아졌습니다' 톤.
export function OverconfidenceBanner() {
  return (
    <NoticeBanner tone="shield">
      여기에 보이는 결론은{" "}
      <span className="font-medium text-foreground">근거의 모음</span>이며, 특정
      시점에 사거나 팔라는 권유가 아닙니다. 신호가 뚜렷해 보일 때일수록 한 가지
      지표에 과신하지 않도록 주의하세요.
    </NoticeBanner>
  );
}
