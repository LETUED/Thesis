import { NoticeBanner } from "@/components/ui/notice-banner";

// snapshot.partial(일부 티커 수집 실패, 전면 실패=stale 과 구분)일 때만 노출.
// 철학5: 일부 지표가 누락된 채 산출된 결론임을 정직하게 알려 과신을 막는다. 공포 톤 금지.
export function PartialDataNotice({ failedCount }: { failedCount: number }) {
  if (failedCount <= 0) return null;
  return (
    <NoticeBanner tone="warn">
      일부 지표({failedCount}개)를 불러오지 못해, 그만큼 근거가 제한된 결론입니다.
      누락된 지표는 다음 갱신에서 다시 시도합니다.
    </NoticeBanner>
  );
}
