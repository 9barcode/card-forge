# Card Forge Supabase 서버

이 폴더는 Supabase 프로젝트의 PostgreSQL 마이그레이션과 Edge Functions를 관리합니다.
기존 `apps/server/src` NestJS 구현은 전환이 끝날 때까지 참고 구현으로 유지합니다.

## 원격 프로젝트 연결

`apps/server` 디렉터리에서 다음 명령을 실행합니다.

```bash
npx supabase login
npx supabase link --project-ref nmbdwukrvwfaxpasbppj
```

프로젝트 비밀번호, service role key, mTLS 인증서와 개인키는 Git에 커밋하지 않습니다.
필요한 운영 비밀값은 Supabase Project Secrets에 등록합니다.

## 현재 구현 범위

- Supabase CLI 설정
- `game-api` Edge Function 진입점
- `GET /functions/v1/game-api/health` 연결 확인 응답
- CORS 및 JSON 응답 공통 도구
- 비밀 환경 파일 제외 규칙
- `데이터베이스_구조.md` 기준 최초 DB 마이그레이션
- `users`, `cards`, `user_cards` 3개 테이블과 카드 36종 초기 데이터
- 앱의 직접 테이블 접근을 막는 RLS 및 권한 회수
- 만료·폐기가 가능한 게임 전용 회원 세션
- 세션 토큰과 토스 식별값의 HMAC digest 저장
- 회원 초기화·조회·닉네임 수정·로그아웃 DB 함수
- 회원 API 경로와 입력·세션 검증

카드 판매, 결정 증감과 포인트 교환은 현재 DB 구조 문서의 제외 범위이므로
별도 설계 확정 후 후속 마이그레이션에서 구현합니다.

## 회원 API

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| `POST` | `/functions/v1/game-api/api/v1/user-sessions` | 토스 검증 후 회원과 세션 초기화 |
| `GET` | `/functions/v1/game-api/api/v1/users/me` | 현재 회원 조회 |
| `PATCH` | `/functions/v1/game-api/api/v1/users/me` | 닉네임 변경 |
| `DELETE` | `/functions/v1/game-api/api/v1/user-sessions/current` | 현재 세션 폐기 |

`TOSS_USER_VERIFICATION_URL`과 관련 mTLS 구성이 없는 환경에서는 회원 초기화를
성공 처리하지 않고 `503 TOSS_VERIFICATION_NOT_CONFIGURED`로 거절합니다.
