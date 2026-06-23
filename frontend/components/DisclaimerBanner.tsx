import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NoticeBanner } from "@/components/ui/notice-banner";

// 응답마다 백엔드가 보내는 disclaimer 문자열을 그대로 노출한다.
// variant='inline' 은 결과 카드 하단, variant='emphasis' 는 과신방지 강조 배너.
export function DisclaimerBanner({
  text,
  variant = "inline",
  className,
}: {
  text: string;
  variant?: "inline" | "emphasis";
  className?: string;
}) {
  if (!text) return null;

  if (variant === "emphasis") {
    return (
      <NoticeBanner
        tone="info"
        icon={Info}
        className={cn(
          "gap-2 rounded-md bg-muted/50 text-xs [&>svg]:mt-0.5 [&>svg]:h-4 [&>svg]:w-4",
          className,
        )}
      >
        <span>{text}</span>
      </NoticeBanner>
    );
  }

  return (
    <p
      className={cn(
        "text-xs leading-relaxed text-muted-foreground",
        className,
      )}
      role="note"
    >
      {text}
    </p>
  );
}
