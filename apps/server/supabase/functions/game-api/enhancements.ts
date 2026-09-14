import { createServerDatabase } from '../_shared/database.ts';
import { json } from '../_shared/http.ts';
import { rejectProbabilityConfigMismatch } from '../_shared/probability-config.ts';
import {
  type CardGrade,
  drawEnhancementResult,
  MAX_ENHANCEMENT_LEVEL,
  secureEnhancementTicket,
} from './enhancement-domain.ts';
import { requireSessionUser } from './membership.ts';

export async function handleEnhancements(request: Request, path: string): Promise<Response | null> {
  if (request.method !== 'POST' || !path.endsWith('/api/v1/enhancements')) return null;
  const mismatch = rejectProbabilityConfigMismatch(request);
  if (mismatch) return mismatch;
  const userId = await requireSessionUser(request);
  const requestId = request.headers.get('idempotency-key') ?? '';
  if (!/^[A-Za-z0-9._:-]{8,100}$/.test(requestId)) {
    return json({ code: 'INVALID_IDEMPOTENCY_KEY' }, 400);
  }
  const body = await readJson(request);
  if (!isPositiveId(body?.cardId)) return json({ code: 'INVALID_CARD_ID' }, 400);
  const database = createServerDatabase();
  const { data: inventory, error: inventoryError } = await database.rpc('get_game_inventory', {
    p_user_id: userId,
  });
  if (inventoryError) return json({ code: 'INVENTORY_LOOKUP_FAILED' }, 500);
  const card = findEnhancementCard(inventory, body.cardId);
  if (card === null) return json({ code: 'CARD_NOT_FOUND' }, 404);
  if (card.level >= MAX_ENHANCEMENT_LEVEL) {
    return json({ code: 'MAX_ENHANCEMENT_LEVEL' }, 409);
  }

  const result = drawEnhancementResult(
    card.level + 1,
    card.grade,
    secureEnhancementTicket(),
  );
  const { data, error } = await database.rpc('enhance_game_card', {
    p_user_id: userId,
    p_request_id: requestId,
    p_user_card_id: Number(body.cardId),
    p_expected_level: card.level,
    p_success: result === 'SUCCESS',
  });
  if (error) return databaseError(error.message);
  return json(data, 200);
}

function findEnhancementCard(
  value: unknown,
  cardId: string,
): { level: number; grade: CardGrade } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const cards = (value as { cards?: unknown }).cards;
  if (!Array.isArray(cards)) return null;
  const card = cards.find((item) =>
    item && typeof item === 'object' && (item as { cardId?: unknown }).cardId === cardId
  ) as { enhancementLevel?: unknown; grade?: unknown } | undefined;
  if (
    typeof card?.enhancementLevel !== 'number' ||
    !Number.isSafeInteger(card.enhancementLevel) ||
    !isCardGrade(card.grade)
  ) {
    return null;
  }
  return { level: card.enhancementLevel, grade: card.grade };
}

function isCardGrade(value: unknown): value is CardGrade {
  return [
    'NORMAL',
    'MAGIC',
    'RARE',
    'SUPER_RARE',
    'UNIQUE',
    'LEGENDARY',
  ].includes(value as CardGrade);
}

function isPositiveId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value);
}

function databaseError(message: string): Response {
  const conflict = [
    'ENHANCEMENT_PERMANENTLY_LOCKED',
    'MAX_ENHANCEMENT_LEVEL',
    'ENHANCEMENT_STATE_CHANGED',
  ].find((code) => message.includes(code));
  if (conflict) return json({ code: conflict }, 409);
  if (message.includes('CARD_NOT_FOUND')) return json({ code: 'CARD_NOT_FOUND' }, 404);
  return json({ code: 'ENHANCEMENT_FAILED' }, 500);
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
