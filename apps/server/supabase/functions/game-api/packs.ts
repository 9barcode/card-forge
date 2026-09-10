import { createServerDatabase } from '../_shared/database.ts';
import { json } from '../_shared/http.ts';
import { requireSessionUser } from './membership.ts';
import { drawCardTemplateId, secureRandomBelow } from './pack-opening-domain.ts';

export async function handlePacks(request: Request, path: string): Promise<Response | null> {
  if (request.method !== 'POST' || !path.endsWith('/api/v1/pack-openings')) return null;
  const userId = await requireSessionUser(request);
  const requestId = request.headers.get('idempotency-key') ?? '';
  if (!/^[A-Za-z0-9._:-]{8,100}$/.test(requestId)) {
    return json({ code: 'INVALID_IDEMPOTENCY_KEY' }, 400);
  }
  const body = await readJson(request);
  if (!isAcceptedTestAdProof(body?.adCompletionId)) {
    return json({ code: 'AD_COMPLETION_NOT_VERIFIED' }, 403);
  }

  const database = createServerDatabase();
  const { data, error } = await database.rpc('open_game_pack', {
    p_user_id: userId,
    p_request_id: requestId,
    p_card_id: drawCardTemplateId(secureRandomBelow(10_000), secureRandomBelow(6)),
  });
  if (error) return databaseError(error.message);
  return json(data, 201);
}

function isAcceptedTestAdProof(value: unknown): boolean {
  return Deno.env.get('ALLOW_TEST_AD_REWARDS') === 'true'
    && typeof value === 'string'
    && /^local-test-ad-\d+$/.test(value);
}

function databaseError(message: string): Response {
  const code = ['CARD_STORAGE_FULL', 'DAILY_PACK_LIMIT_REACHED'].find((item) =>
    message.includes(item)
  );
  if (code) return json({ code }, 409);
  return json({ code: 'PACK_OPENING_FAILED' }, 500);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
