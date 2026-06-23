// 데이터 "기준 시각" 표시 포맷.
// 고정 타임존(Asia/Seoul)·로케일(ko-KR)·24시간으로 결정적이라 SSR↔CSR 하이드레이션이 안정적이다.
// 상대시간("n분 전")은 렌더 시점마다 값이 달라져 하이드레이션 불일치를 유발하므로 쓰지 않는다.
export function formatAsOf(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
