"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** id of the element labelling the dialog (e.g. a heading) for aria-labelledby. */
  labelledBy?: string;
  /** "center" 모달(기본) 또는 우측 슬라이드 "drawer". */
  side?: "center" | "drawer";
  className?: string;
}

// 모달/드로어 공통 셸. CompanySearch·MarketDrawer 오버레이 패턴을 일반화:
// backdrop(바깥 클릭 닫기) + 내용 stopPropagation + Esc 닫기 + focus-trap +
// 최초 포커스 이동 + role="dialog"/aria-modal. 신규 전용(기존 소비처는 Phase 3에서 연결).
export function ModalShell({
  open,
  onClose,
  children,
  labelledBy,
  side = "center",
  className,
}: ModalShellProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const lastActiveRef = React.useRef<HTMLElement | null>(null);

  // 최초 포커스 이동 + 닫을 때 직전 포커스 복원.
  React.useEffect(() => {
    if (!open) return;
    lastActiveRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }
    return () => {
      lastActiveRef.current?.focus?.();
    };
  }, [open]);

  // Esc 닫기 + Tab focus-trap.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const nodes = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (nodes.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  const isDrawer = side === "drawer";

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex backdrop-blur-sm",
        isDrawer
          ? "justify-end bg-background/40"
          : "items-start justify-center bg-background/60 p-4 pt-20",
      )}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "border-border bg-card shadow-xl outline-none",
          isDrawer
            ? "flex h-full w-full max-w-md flex-col border-l"
            : "w-full max-w-md overflow-hidden rounded-lg border",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
