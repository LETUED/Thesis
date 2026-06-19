THESIS Supabase DB 스키마를 설계한다.

요청: $ARGUMENTS

설계 기준:
- PostgreSQL + Supabase RLS 처음부터 적용
- 플랜 구분: free / pro / quant (users 테이블에 plan 컬럼)
- RLS 정책: 사용자는 자신의 데이터만 접근
- created_at / updated_at 모든 테이블에 포함
- soft delete (deleted_at) 사용 (실제 삭제 금지)
- 인덱스: 자주 조회하는 컬럼에 명시

출력 형태:
1. ERD 텍스트 다이어그램
2. Supabase SQL 마이그레이션 파일
3. RLS 정책 SQL
