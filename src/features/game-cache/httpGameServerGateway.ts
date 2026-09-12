import type { GameServerGateway } from './gameActionService';
import type {
  CachedOwnedCard,
  CachedPackAvailability,
  CardElement,
  CardGrade,
  CardStatus,
  ServerCardSaleResult,
  ServerEnhancementResult,
  ServerGameSnapshot,
  ServerPackOpeningResult,
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
    async reservePackOpening(command): Promise<void> {
      const response = await fetchImplementation(
        `${baseUrl}/api/v1/pack-openings/reservations`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${command.accessToken}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': command.requestId,
          },
          body: JSON.stringify({}),
        },
      );
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(errorCode(data, `GAME_API_${response.status}`));
      }
    },
    async openPack(command): Promise<ServerPackOpeningResult> {
      const response = await fetchImplementation(
        `${baseUrl}/api/v1/pack-openings`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${command.accessToken}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': command.requestId,
          },
          body: JSON.stringify({}),
        },
      );
      const data = await readJson(response);
      if (!response.ok)
        throw new Error(errorCode(data, `GAME_API_${response.status}`));
      return parsePackOpeningResult(data);
    },
    async enhanceCard(command): Promise<ServerEnhancementResult> {
      const response = await fetchImplementation(
        `${baseUrl}/api/v1/enhancements`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${command.accessToken}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': command.requestId,
          },
          body: JSON.stringify({
            cardId: command.cardId,
            adCompletionId: command.adCompletionId,
          }),
        },
      );
      const data = await readJson(response);
      if (!response.ok)
        throw new Error(errorCode(data, `GAME_API_${response.status}`));
      return parseEnhancementResult(data);
    },
    async sellCards(command): Promise<ServerCardSaleResult> {
      const response = await fetchImplementation(
        `${baseUrl}/api/v1/card-sales`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${command.accessToken}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': command.requestId,
          },
          body: JSON.stringify({
            cardIds: command.cardIds,
            adCompletionId: command.adCompletionId,
          }),
        },
      );
      const data = await readJson(response);
      if (!response.ok)
        throw new Error(errorCode(data, `GAME_API_${response.status}`));
      return parseCardSaleResult(data);
    },
    exchangePoints: notImplemented('POINT_EXCHANGE_API_NOT_IMPLEMENTED'),
  };
}

function parseCardSaleResult(value: unknown): ServerCardSaleResult {
  const source = record(value);
  if (!Array.isArray(source.soldCardIds))
    throw new Error('INVALID_GAME_API_RESPONSE');
  const soldCardIds = source.soldCardIds.map(string);
  if (
    soldCardIds.length < 1 ||
    soldCardIds.length > 5 ||
    new Set(soldCardIds).size !== soldCardIds.length
  ) {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  return {
    soldCardIds,
    crystalReward: nonnegativeSafeInteger(source.crystalReward),
    crystalBalance: nonnegativeSafeInteger(source.crystalBalance),
    packAvailability: parsePackAvailability(source.packAvailability),
  };
}

function parseEnhancementResult(value: unknown): ServerEnhancementResult {
  const source = record(value);
  const result = string(source.result);
  if (result !== 'SUCCESS' && result !== 'FAILURE') {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  const card = parseCard(source.card);
  if (
    (result === 'FAILURE' && card.status !== 'ENHANCEMENT_LOCKED') ||
    (result === 'SUCCESS' && card.status === 'ENHANCEMENT_LOCKED')
  ) {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  return { card, result };
}

function parsePackOpeningResult(value: unknown): ServerPackOpeningResult {
  // 카드 생성과 제한 검사는 Supabase 트랜잭션이 확정합니다.
  // 성공 응답은 그대로 캐시에 반영해 클라이언트의 중복 검증을 피합니다.
  return value as ServerPackOpeningResult;
}

function parsePackAvailability(value: unknown): CachedPackAvailability {
  const source = record(value);
  const dailyLimit = integer(source.dailyLimit);
  const usedToday = integer(source.usedToday);
  const remainingToday = integer(source.remainingToday);
  const ownedCardCount = integer(source.ownedCardCount);
  const storageCapacity = integer(source.storageCapacity);
  const storageFull = boolean(source.storageFull);
  if (
    usedToday > dailyLimit ||
    remainingToday !== dailyLimit - usedToday ||
    ownedCardCount > storageCapacity ||
    storageFull !== ownedCardCount >= storageCapacity
  ) {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  return {
    packType: string(source.packType),
    dailyLimit,
    usedToday,
    remainingToday,
    ownedCardCount,
    storageCapacity,
    storageFull,
    nextResetAt: isoDate(source.nextResetAt),
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
  const status = parseCardStatus(source.status, enhancementLevel);
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
    status,
    acquiredAt:
      typeof source.acquiredAt === 'string' && source.acquiredAt !== ''
        ? isoDate(source.acquiredAt)
        : '',
  };
}

function parseCardStatus(value: unknown, enhancementLevel: number): CardStatus {
  if (value === undefined) {
    return enhancementLevel >= 10 ? 'MAX_LEVEL' : 'ENHANCEABLE';
  }
  if (
    value !== 'ENHANCEABLE' &&
    value !== 'ENHANCEMENT_LOCKED' &&
    value !== 'MAX_LEVEL'
  ) {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  if (
    (value === 'MAX_LEVEL') !== enhancementLevel >= 10 ||
    (value === 'ENHANCEABLE' && enhancementLevel >= 10)
  ) {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  return value;
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

function nonnegativeSafeInteger(value: unknown): number {
  const result =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return integer(result);
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('INVALID_GAME_API_RESPONSE');
  return value;
}

function isoDate(value: unknown): string {
  const result = string(value);
  if (Number.isNaN(new Date(result).getTime())) {
    throw new Error('INVALID_GAME_API_RESPONSE');
  }
  return result;
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
