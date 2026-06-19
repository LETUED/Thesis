"use client";

import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// 절제된 모션 토대. LazyMotion+strict 로 번들 최소화(m.* 만 사용),
// MotionConfig reducedMotion="user" 로 OS '동작 줄이기' 설정을 전역 존중.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
