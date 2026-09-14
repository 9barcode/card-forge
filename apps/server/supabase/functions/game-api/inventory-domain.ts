const elements = new Set(['EARTH', 'WATER', 'WIND', 'FIRE', 'LIGHT', 'DARK']);
const grades = new Set(['NORMAL', 'MAGIC', 'RARE', 'SUPER_RARE', 'UNIQUE', 'LEGENDARY']);
const statuses = new Set(['ENHANCEABLE', 'ENHANCEMENT_LOCKED', 'MAX_LEVEL']);
const publicCardImageUrl =
  /^https:\/\/nmbdwukrvwfaxpasbppj[.]supabase[.]co\/storage\/v1\/object\/public\/images\/cards\/webp\/[a-z0-9_]+[.]webp(?:[?]v=\d+)?$/;

export type InventoryCard = {
  cardId: string;
  templateId: string;
  name: string;
  element: string;
  grade: string;
  imageKey: string;
  enhancementLevel: number;
  status: 'ENHANCEABLE' | 'ENHANCEMENT_LOCKED' | 'MAX_LEVEL';
};

export type GameInventory = {
  userId: string;
  crystalBalance: number;
  totalCrystalsEarned: number;
  cards: InventoryCard[];
};

export function parseGameInventory(value: unknown): GameInventory {
  const source = record(value, 'INVALID_INVENTORY_RESPONSE');
  const userId = positiveId(source.userId, 'INVALID_INVENTORY_USER');
  const crystalBalance = safeNonnegativeInteger(source.crystalBalance, 'INVALID_CRYSTAL_BALANCE');
  const totalCrystalsEarned = safeNonnegativeInteger(
    source.totalCrystalsEarned,
    'INVALID_TOTAL_CRYSTALS_EARNED',
  );
  if (totalCrystalsEarned < crystalBalance) throw new Error('INVALID_CRYSTAL_TOTAL');
  if (!Array.isArray(source.cards)) throw new Error('INVALID_INVENTORY_CARDS');

  return {
    userId,
    crystalBalance,
    totalCrystalsEarned,
    cards: source.cards.map(parseCard),
  };
}

function parseCard(value: unknown): InventoryCard {
  const source = record(value, 'INVALID_INVENTORY_CARD');
  const element = text(source.element, 'INVALID_CARD_ELEMENT');
  const grade = text(source.grade, 'INVALID_CARD_GRADE');
  const storedStatus = text(source.status, 'INVALID_CARD_STATUS') as InventoryCard['status'];
  if (!elements.has(element)) throw new Error('INVALID_CARD_ELEMENT');
  if (!grades.has(grade)) throw new Error('INVALID_CARD_GRADE');
  if (!statuses.has(storedStatus)) throw new Error('INVALID_CARD_STATUS');
  const enhancementLevel = safeNonnegativeInteger(
    source.enhancementLevel,
    'INVALID_ENHANCEMENT_LEVEL',
  );
  const status = enhancementLevel >= 10 ? 'MAX_LEVEL' : storedStatus;
  return {
    cardId: positiveId(source.cardId, 'INVALID_CARD_ID'),
    templateId: positiveId(source.templateId, 'INVALID_TEMPLATE_ID'),
    name: text(source.name, 'INVALID_CARD_NAME'),
    element,
    grade,
    imageKey: cardImageReference(source.imageKey),
    enhancementLevel,
    status,
  };
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function positiveId(value: unknown, code: string): string {
  const result = text(value, code);
  if (!/^[1-9]\d*$/.test(result)) throw new Error(code);
  return result;
}

function text(value: unknown, code: string): string {
  if (typeof value !== 'string') throw new Error(code);
  return value;
}

function cardImageReference(value: unknown): string {
  const result = text(value, 'INVALID_CARD_IMAGE');
  const isLegacyStorageKey =
    result === '' ||
    (result.startsWith('cards/') && !result.includes('..'));
  if (!isLegacyStorageKey && !publicCardImageUrl.test(result)) {
    throw new Error('INVALID_CARD_IMAGE');
  }
  return result;
}

function safeNonnegativeInteger(value: unknown, code: string): number {
  const result = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof result !== 'number' || !Number.isSafeInteger(result) || result < 0) {
    throw new Error(code);
  }
  return result;
}
