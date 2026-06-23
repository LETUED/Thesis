import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// globals:false 라 RTL 의 자동 afterEach cleanup 이 등록되지 않는다.
// 렌더가 document 에 누적돼 getByRole 등이 다중 매치로 깨지므로 수동 정리.
afterEach(() => {
  cleanup();
});
