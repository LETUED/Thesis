import { Layers, RefreshCw, LineChart } from "lucide-react";

// 게스트가 결론을 본 뒤 가입을 결정할 때 '무엇이 펼쳐지는지'를 입문자 눈높이로 보여준다.
// 결론무료/근거유료 철학을 가입 동기로 연결. 수익 보장·매수 권유 금지, 갱신 주기는 정직하게.
const ITEMS = [
  {
    icon: Layers,
    title: "근거까지 펼쳐보기",
    desc: "방금 본 국면 결론의 지표별 기여도·한국 시장 신호를 Pro에서 모두 펼쳐보기",
  },
  {
    icon: RefreshCw,
    title: "더 자주 갱신되는 지표",
    desc: "16개 핵심 지표를 30분 주기로 추적",
  },
  {
    icon: LineChart,
    title: "내 자산배분 추적",
    desc: "기간·성향을 바꿔가며 현재 국면에 맞는 배분을 저장",
  },
];

export function SignupValueProps() {
  return (
    <ul className="space-y-3" aria-label="가입하면 펼쳐지는 것">
      {ITEMS.map(({ icon: Icon, title, desc }) => (
        <li key={title} className="flex gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-regime-on" aria-hidden />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
