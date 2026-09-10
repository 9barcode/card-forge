const elements = new Set(['EARTH', 'WATER', 'WIND', 'FIRE', 'LIGHT', 'DARK']);
const grades = new Set(['NORMAL', 'MAGIC', 'RARE', 'SUPER_RARE', 'UNIQUE', 'LEGENDARY']);

export type InventoryCard = {
  cardId: string;
  templateId: string;
  name: string;
  element: string;
  grade: string;
  imageKey: string;
  enhancementLevel: number;
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
  if (!elements.has(element)) throw new Error('INVALID_CARD_ELEMENT');
  if (!grades.has(grade)) throw new Error('INVALID_CARD_GRADE');
  return {
    cardId: positiveId(source.cardId, 'INVALID_CARD_ID'),
    templateId: positiveId(source.templateId, 'INVALID_TEMPLATE_ID'),
    name: text(source.name, 'INVALID_CARD_NAME'),
    element,
    grade,
    imageKey: text(source.imageKey, 'INVALID_CARD_IMAGE'),
    enhancementLevel: safeNonnegativeInteger(
      source.enhancementLevel,
      'INVALID_ENHANCEMENT_LEVEL',
    ),
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

function safeNonnegativeInteger(value: unknown, code: string): number {
  const result = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof result !== 'number' || !Number.isSafeInteger(result) || result < 0) {
    throw new Error(code);
  }
  return result;
}
