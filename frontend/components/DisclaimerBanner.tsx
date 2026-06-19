import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

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
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground",
          className,
        )}
        role="note"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{text}</span>
      </div>
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
