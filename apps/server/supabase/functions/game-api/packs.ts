import { createServerDatabase } from '../_shared/database.ts';
import { json } from '../_shared/http.ts';
import { requireSessionUser } from './membership.ts';
import { drawCardTemplateId, secureRandomBelow } from './pack-opening-domain.ts';

export async function handlePacks(request: Request, path: string): Promise<Response | null> {
  if (!request.method || request.method !== 'POST' || !path.endsWith('/api/v1/pack-openings')) return null;
  const userId = await requireSessionUser(request);
  const requestId = request.headers.get('idempotency-key') ?? '';
  if (!/^[A-Za-z0-9._:-]{8,100}$/.test(requestId)) {
    return json({ code: 'INVALID_IDEMPOTENCY_KEY' }, 400);
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

function databaseError(message: string): Response {
  const code = [
    'CARD_STORAGE_FULL',
    'DAILY_PACK_LIMIT_REACHED',
    'PACK_OPEN_COOLDOWN_ACTIVE',
  ].find((item) =>
    message.includes(item)
  );
  if (code) return json({ code }, 409);
  return json({ code: 'PACK_OPENING_FAILED' }, 500);
}

