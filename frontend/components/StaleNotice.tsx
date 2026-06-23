import { NoticeBanner } from "@/components/ui/notice-banner";

// cache_status='stale'(전 티커 실패→이전 데이터 폴백)일 때만 노출.
// 철학5: 어제 데이터로 오늘 판단하지 않도록 신선도 지연을 정직하게 고지.
export function StaleNotice() {
  return (
    <NoticeBanner tone="warn">
      데이터 갱신이 지연되고 있어, 지금 보이는 값은 최신이 아닐 수 있습니다.
    </NoticeBanner>
  );
}
