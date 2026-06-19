// Build-only Tailwind config for design-sync: same theme/content as the app,
// plus a safelist so EVERY semantic token utility is emitted (the design agent
// composes new layouts and must be able to use the full token palette, not
// only the utilities the existing app happened to use).
import base from "../tailwind.config";
import type { Config } from "tailwindcss";

const config: Config = {
  ...base,
  safelist: [
    { pattern: /(bg|text|border)-(background|foreground|border|on-emphasis|surface-1|surface-2)/ },
    { pattern: /(bg|text|border)-(card|muted)(-foreground)?/ },
    { pattern: /(bg|text|border)-regime-(on|neutral|off)/ },
    { pattern: /(bg|text|border)-regime-(on|off)-muted/ },
    { pattern: /(bg|text|border)-regime-off-strong/ },
    { pattern: /rounded-(sm|md|lg)/ },
  ],
};

export default config;
