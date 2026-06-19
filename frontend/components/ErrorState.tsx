import { CloudOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// 백엔드 502/네트워크 실패 폴백. 절대 단정 문구 금지 — 중립 톤.
export function ErrorState({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CloudOff className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">
          지금은 시장 국면을 불러올 수 없습니다
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {message ??
            "외부 데이터가 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요."}
        </p>
      </CardContent>
    </Card>
  );
}
