import type { GameServerGateway } from './gameActionService';
import type {
  CachedOwnedCard,
  CardElement,
  CardGrade,
  ServerGameSnapshot,
} from './gameCache';

const elements = new Set<CardElement>([
  'EARTH',
  'WATER',
  'WIND',
  'FIRE',
  'LIGHT',
  'DARK',
]);
const grades = new Set<CardGrade>([
  'NORMAL',
  'MAGIC',
  'RARE',
  'SUPER_RARE',
  'UNIQUE',
  'LEGENDARY',
]);

export function createHttpGameServerGateway({
  apiBaseUrl,
  fetchImplementation = fetch,
}: {
  apiBaseUrl: string;
  fetchImplementation?: typeof fetch;
}): GameServerGateway {
  const baseUrl = apiBaseUrl.replace(/\/$/, '');

  return {
    async loadGame(accessToken): Promise<ServerGameSnapshot> {
      const response = await fetchImplementation(
        `${baseUrl}/api/v1/inventory`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const data = await readJson(response);
      if (!response.ok)
        throw new Error(errorCode(data, `GAME_API_${response.status}`));
      return parseSnapshot(data);
    },
    openPack: notImplemented('PACK_OPENING_API_NOT_IMPLEMENTED'),
    enhanceCard: notImplemented('ENHANCEMENT_API_NOT_IMPLEMENTED'),
    sellCards: notImplemented('CARD_SALE_API_NOT_IMPLEMENTED'),
    exchangePoints: notImplemented('POINT_EXCHANGE_API_NOT_IMPLEMENTED'),
  };
}

function parseSnapshot(value: unknown): ServerGameSnapshot {
  const source = record(value);
  const cardsValue = source.cards;
  if (!Array.isArray(cardsValue)) throw new Error('INVALID_GAME_API_RESPONSE');
  const cards = cardsValue.map(parseCard);
  const crystalBalance = integer(source.crystalBalance);
  const syncedAt = string(source.syncedAt);
  return {
    cards,
    crystalBalance,
    packAvailability: {
      packType: 'FREE_DAILY',
      dailyLimit: 20,
      usedToday: 0,
      remainingToday: 20,
      ownedCardCount: cards.length,
      storageCapacity: 5,
      storageFull: cards.length >= 5,
      nextResetAt: nextUtcDay(syncedAt),
    },
    syncedAt,
  };
}

function parseCard(value: unknown): CachedOwnedCard {
  const source = record(value);
  const element = string(source.element) as CardElement;
  const grade = string(source.grade) as CardGrade;
  const enhancementLevel = integer(source.enhancementLevel);
  if (!elements.has(element) || !grades.has(grade))
    throw new Error('INVALID_GAME_API_RESPONSE');
  return {
    cardId: string(source.cardId),
    templateId: string(source.templateId),
    name: string(source.name),
    element,
    grade,
    imageKey: string(source.imageKey),
    enhancementLevel,
    status: enhancementLevel >= 10 ? 'MAX_LEVEL' : 'ENHANCEABLE',
    acquiredAt: '',
  };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  return value as Record<string, unknown>;
}

function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('INVALID_GAME_API_RESPONSE');
  return value;
}

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  return value;
}

function errorCode(value: unknown, fallback: string): string {
  return value &&
    typeof value === 'object' &&
    'code' in value &&
    typeof (value as { code?: unknown }).code === 'string'
    ? (value as { code: string }).code
    : fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
}

function nextUtcDay(now: string): string {
  const date = new Date(now);
  if (Number.isNaN(date.getTime()))
    throw new Error('INVALID_GAME_API_RESPONSE');
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  ).toISOString();
}

function notImplemented(code: string) {
  return () => Promise.reject(new Error(code));
}
