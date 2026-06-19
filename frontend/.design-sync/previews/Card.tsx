import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from "thesis-frontend";

export const Basic = () => (
  <div className="max-w-md p-6">
    <Card>
      <CardHeader>
        <CardTitle>자산 배분 제안</CardTitle>
        <CardDescription>현재 국면을 반영한 참고용 배분입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          주식 55% · 채권 25% · 현금 20%
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline">
          근거 보기
        </Button>
      </CardFooter>
    </Card>
  </div>
);

export const HeaderOnly = () => (
  <div className="max-w-md p-6">
    <Card>
      <CardHeader>
        <CardTitle>매크로 · 시장 국면</CardTitle>
        <CardDescription>위험 선호가 약해지는 구간입니다.</CardDescription>
      </CardHeader>
    </Card>
  </div>
);
