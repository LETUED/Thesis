// design-sync preview stub for next/link — renders a plain <a> (no Next router needed).
import * as React from "react";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string | { pathname?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  locale?: string | false;
};

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, prefetch, replace, scroll, shallow, locale, children, ...rest },
  ref,
) {
  const h = typeof href === "string" ? href : href?.pathname ?? "#";
  return React.createElement("a", { ref, href: h, ...rest }, children);
});

export default Link;
