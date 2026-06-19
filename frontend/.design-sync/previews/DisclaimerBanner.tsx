import { DisclaimerBanner } from "thesis-frontend";

const TEXT =
  "이 화면의 결론은 여러 지표를 종합한 참고용 분석이며, 특정 종목을 사거나 팔라는 권유가 아닙니다. 투자 판단과 책임은 본인에게 있습니다.";

export const Inline = () => (
  <div className="max-w-md p-6">
    <DisclaimerBanner text={TEXT} />
  </div>
);

export const Emphasis = () => (
  <div className="max-w-md p-6">
    <DisclaimerBanner text={TEXT} variant="emphasis" />
  </div>
);
