import { createServerDatabase } from '../_shared/database.ts';
import { json } from '../_shared/http.ts';
import { requireSessionUser } from './membership.ts';

export async function handleSales(request: Request, path: string): Promise<Response | null> {
  if (request.method !== 'POST' || !path.endsWith('/api/v1/card-sales')) return null;

  const userId = await requireSessionUser(request);
  const requestId = request.headers.get('idempotency-key') ?? '';
  if (!/^[A-Za-z0-9._:-]{8,100}$/.test(requestId)) {
    return json({ code: 'INVALID_IDEMPOTENCY_KEY' }, 400);
  }

  // 광고 시청 성공 여부는 앱에서 확인합니다. 서버는 광고 completionId를
  // 인증하지 않고 카드 소유권과 중복 요청만 검증합니다.
  const body = await readJson(request);
  const cardIds = parseCardIds(body?.cardIds);
  if (!cardIds) return json({ code: 'INVALID_CARD_IDS' }, 400);
  const database = createServerDatabase();
  const { data, error } = await database.rpc('sell_game_cards', {
    p_user_id: userId,
    p_request_id: requestId,
    p_user_card_ids: cardIds.map(Number),
  });
  if (error) return databaseError(error.message);
  return json(data, 200);
}

function parseCardIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) return null;
  if (!value.every(isPositiveSafeId)) return null;
  const result = value as string[];
  return new Set(result).size === result.length ? result : null;
}

function isPositiveSafeId(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0;
}

function databaseError(message: string): Response {
  if (message.includes('CARD_NOT_FOUND')) return json({ code: 'CARD_NOT_FOUND' }, 404);
  if (message.includes('INVALID_CARD_IDS')) return json({ code: 'INVALID_CARD_IDS' }, 400);
  return json({ code: 'CARD_SALE_FAILED' }, 500);
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
