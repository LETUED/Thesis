# THESIS design system — build conventions

THESIS is a Korean investing-decision product (macro regime → asset allocation → company analysis). Components are React (Next.js app), styled with **Tailwind CSS + semantic CSS-variable tokens**. Import every component from the bundle global (`window.Thesis.*`); they render with the shipped `styles.css`.

## Setup / theming
- **No provider is required** for most components — they render styled out of the box from `styles.css`.
- **Dark mode is class-based**: tokens flip when an ancestor has `class="dark"`. Default (no class) is light. To preview dark, wrap in `<div className="dark">`. Dark is the product's primary surface — prefer it for full-screen layouts.
- A few components read optional context: `ThemeToggle` uses `next-themes` (renders fine without it). Auth/billing/lab components (`LogoutButton`, `UpgradeButton`, `BlockCanvas`, `MarketDrawer`) are app-coupled (Supabase / React Flow / routing) — usable but not meant for standalone composition.

## Styling idiom — Tailwind utilities mapped to semantic tokens
Never hardcode hex/colors. Use these token-backed utilities (each is `hsl(var(--token))`, light/dark-aware):

| Surface / text | Utility |
|---|---|
| Page bg / text | `bg-background` / `text-foreground` |
| Card surface | `bg-card` `text-card-foreground` (raised: `bg-surface-1`, `bg-surface-2`) |
| Muted fill / text | `bg-muted` / `text-muted-foreground` |
| Border | `border-border` |
| Text on bright solids | `text-on-emphasis` |

**Regime tokens** (market state — the brand's signal colors): `regime-on` (emerald, risk-on), `regime-neutral` (slate), `regime-off` (amber, caution), `regime-off-strong` (rose, severe-only). Use as `text-regime-on`, `bg-regime-on-muted`, `text-regime-off`, `bg-regime-off-muted`, `text-regime-off-strong`, etc. `*-muted` variants are pale fills for chip/badge backgrounds.

Radius: `rounded-lg` (cards), `rounded-md`, `rounded-sm` (all derive from `--radius`). Raw vars exist too: `hsl(var(--regime-off))`, `var(--radius)`.

## Where the truth lives
- `styles.css` (imports `_ds_bundle.css` = compiled Tailwind incl. the `:root` / `.dark` token blocks) — read it for the exact token values.
- Per-component `<Name>.prompt.md` and `<Name>.d.ts` — props and usage.

## Brand voice (non-negotiable for THESIS UI)
- **Never** a "지금 사세요 / Buy now" CTA. Frame as "이런 근거들이 있습니다" (here is the evidence).
- **Conclusion first, evidence on expand.** Don't expose raw indicator numbers (DXY, VIX) to beginners up front.
- **Always show a disclaimer** (`DisclaimerBanner`) and avoid overconfidence (`OverconfidenceBanner`) — even at warning thresholds, never say "sell".
- Free = conclusion/signal; Pro = detailed evidence (`EvidenceLocked` is the upgrade gate, invitational tone).

## One idiomatic snippet
```tsx
import { Card, CardHeader, CardTitle, CardContent, DisclaimerBanner } from "window.Thesis";
<Card>
  <CardHeader>
    <CardTitle>매크로 · 시장 국면</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <span className="inline-flex items-center gap-1.5 rounded-full bg-regime-off-muted px-3 py-1 text-sm font-medium text-regime-off">
      위험 경계
    </span>
    <p className="text-sm text-muted-foreground">위험 선호가 약해지는 구간입니다.</p>
    <DisclaimerBanner text="참고용 분석이며 매수·매도 권유가 아닙니다." />
  </CardContent>
</Card>
```
