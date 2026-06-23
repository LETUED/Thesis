"use client";

import * as React from "react";

// 최후 경계 — 루트 레이아웃(layout.tsx) 자체에서 난 오류를 잡는다. 이 경우 RootLayout 이
// 대체되므로 자체 <html>/<body> 를 렌더해야 하고, 테마/globals.css 에 의존할 수 없어
// 인라인 스타일로 최소 안전 화면만 그린다(디자인 토큰 미사용). 단정·공포 톤 금지.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
          backgroundColor: "#0b0b0c",
          color: "#e7e7ea",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 8px" }}>
            잠시 문제가 생겼어요
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#a1a1aa",
              margin: "0 0 20px",
            }}
          >
            화면을 새로 불러오면 대부분 해결돼요. 계속된다면 잠시 후 다시 방문해
            주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              appearance: "none",
              cursor: "pointer",
              borderRadius: "8px",
              border: "1px solid #3f3f46",
              backgroundColor: "#e7e7ea",
              color: "#0b0b0c",
              fontSize: "0.875rem",
              fontWeight: 600,
              padding: "8px 16px",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
