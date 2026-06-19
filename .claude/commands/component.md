THESIS Next.js 컴포넌트를 생성한다.

요청: $ARGUMENTS

생성 기준:
- shadcn/ui 컴포넌트 기반
- TypeScript strict (any 금지)
- props 타입 인터페이스 파일 상단에 선언
- 로딩 상태: Skeleton 컴포넌트 사용
- 에러 상태: 인라인 에러 메시지 (토스트 남용 금지)
- 모바일 우선 반응형 (Tailwind breakpoint: sm/md/lg)
- 다크모드 대응 (dark: 접두사 사용)
- 설계 철학 적용: 결론 먼저, 감정 언어, 과신 방지

파일 위치: frontend/components/ 하위 적절한 폴더
