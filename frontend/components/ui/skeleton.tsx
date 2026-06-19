import { cn } from "@/lib/utils/cn";

// 로딩 자리표시. motion-safe 로 '동작 줄이기' 사용자에겐 펄스 미적용(접근성).
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("motion-safe:animate-pulse rounded-md bg-muted", className)}
      aria-hidden
    />
  );
}
