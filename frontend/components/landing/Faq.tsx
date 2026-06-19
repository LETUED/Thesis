// FAQ — 네이티브 <details>로 접근성·무JS 아코디언. 톤은 정직·교육형.
const QA = [
  {
    q: "투자 조언인가요?",
    a: "아니요. THESIS는 판단의 근거를 제공할 뿐, 특정 종목·자산의 매수·매도를 권유하지 않습니다.",
  },
  {
    q: "무료로 무엇을 볼 수 있나요?",
    a: "시장 국면 결론과 기본 자산배분을 무료로 봅니다. '왜 그런지' 지표 상세 근거는 Pro에서 펼쳐집니다.",
  },
  {
    q: "데이터는 실시간인가요?",
    a: "약 30분 주기로 갱신됩니다. 어제 데이터로 오늘을 판단하지 않도록 신선도를 표시합니다.",
  },
  {
    q: "한국 시장에 맞나요?",
    a: "원달러·외국인수급·코스피를 1순위 지표로 다루도록 설계했습니다.",
  },
];

export function Faq() {
  return (
    <section className="reveal-up mx-auto max-w-3xl px-4 py-16">
      <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
        자주 묻는 질문
      </h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {QA.map((item) => (
          <details key={item.q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              {item.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
