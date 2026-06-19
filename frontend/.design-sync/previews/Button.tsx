import { Button } from "thesis-frontend";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3 p-6">
    <Button>국면 보기</Button>
    <Button variant="outline">자세히</Button>
    <Button variant="ghost">취소</Button>
    <Button variant="locked">Pro로 보기</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3 p-6">
    <Button size="sm">작게</Button>
    <Button size="default">기본</Button>
    <Button size="lg">크게</Button>
  </div>
);

export const Disabled = () => (
  <div className="flex flex-wrap items-center gap-3 p-6">
    <Button disabled>비활성</Button>
    <Button variant="outline" disabled>
      비활성 아웃라인
    </Button>
  </div>
);
