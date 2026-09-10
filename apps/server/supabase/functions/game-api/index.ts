import { corsHeaders, json } from '../_shared/http.ts';
import { errorResponse, handleMembership } from './membership.ts';

/**
 * Supabase 게임 API의 단일 진입점입니다.
 * 1단계에서는 배포·연결 확인용 health 응답만 제공합니다.
 * 카드/재화 API는 인증과 DB 트랜잭션을 구현한 뒤 경로별로 연결합니다.
 */
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const pathname = new URL(request.url).pathname.replace(/\/$/, '');
  if (request.method === 'GET' && pathname.endsWith('/game-api/health')) {
    return json({ status: 'ok', service: 'card-forge-game-api' });
  }

  try {
    const membershipResponse = await handleMembership(request, pathname);
    if (membershipResponse) return membershipResponse;
  } catch (error) {
    return errorResponse(error);
  }

  return json(
    {
      code: 'GAME_API_NOT_IMPLEMENTED',
      message: '게임 API는 아직 연결되지 않았습니다.',
    },
    501,
  );
});
