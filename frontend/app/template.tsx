"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

// 페이지 전환 크로스페이드(절제). 라우트 이동 시 template 이 리마운트 → 가벼운 등장.
// reduced-motion 은 MotionConfig(전역)가 자동 존중.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
