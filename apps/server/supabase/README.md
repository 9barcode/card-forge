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
- `users`의 현재 결정과 누적 획득 결정 컬럼
- 토스 식별값을 원문 대신 HMAC digest로 저장
- 별도 세션 테이블이 필요 없는 서명형 단기 세션 토큰
- 회원 초기화·조회 DB 함수
- 회원 API 경로와 입력·세션 검증
- mTLS 인증과 분리된 보관함 조회 DB 함수 및 API

결정 저장 컬럼은 준비됐지만 카드 판매, 결정 증감 트랜잭션과 포인트 교환 API는
아직 구현하지 않았습니다. 이후 작업에서도 이 세 테이블 안에서 DB 함수로 구현합니다.

## 회원 API

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| `POST` | `/functions/v1/game-api/api/v1/user-sessions` | 토스 검증 후 회원과 세션 초기화 |
| `GET` | `/functions/v1/game-api/api/v1/users/me` | 현재 회원 조회 |
| `PATCH` | `/functions/v1/game-api/api/v1/users/me` | 현재 DB 문서에 프로필 컬럼이 없어 501 응답 |
| `DELETE` | `/functions/v1/game-api/api/v1/user-sessions/current` | 토큰 검증 후 로그아웃(앱이 토큰 삭제) |
| `GET` | `/functions/v1/game-api/api/v1/inventory` | 현재/누적 결정과 보유 카드 조회 |

보관함 API는 토스 식별키 검증 방법을 알지 못합니다. 앞 단계에서 발급한 게임 세션의
서명과 만료만 검증한 뒤 해당 내부 사용자 ID의 데이터만 조회합니다. 따라서 mTLS 연결은
회원 초기화 경계에만 추가하면 되고 보관함 쿼리와 응답 구조는 바뀌지 않습니다.

`TOSS_USER_VERIFICATION_URL`과 관련 mTLS 구성이 없는 환경에서는 회원 초기화를
성공 처리하지 않고 `503 TOSS_VERIFICATION_NOT_CONFIGURED`로 거절합니다.

## 왜 세션 테이블이 없나요?

`데이터베이스_구조.md`가 정한 테이블은 `users`, `cards`, `user_cards` 세 개뿐입니다.
로그인 세션은 서버가 서명한 단기 토큰에 사용자 ID와 만료 시각을 담아 처리합니다.
요청마다 서명·만료를 검사하고 `users`에 사용자가 실제로 존재하는지도 확인합니다.

이 방식에서는 로그아웃할 때 앱이 토큰을 버립니다. 특정 토큰 하나를 서버에서 즉시
폐기하는 목록은 저장하지 않으므로 기본 만료 시간을 1시간으로 짧게 둡니다. 즉시 강제
로그아웃 기능이 필요해지면 그때 DB 문서를 먼저 변경하고 세션 저장 구조를 추가해야 합니다.

`20260910000200_user_membership.sql`은 이미 원격 DB에 적용된 이력입니다.
`20260910061000_align_three_table_design.sql`이 문서 밖의 테이블과 컬럼을 제거하여
최종 상태를 다시 세 테이블 구조로 맞춥니다. 적용된 마이그레이션 파일은 이력 보존을 위해
삭제하거나 내용을 바꾸지 않습니다.
