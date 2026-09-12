import {
  type GameServerGateway,
  type ServerGameSnapshot,
  gameRuntime,
} from '../../../src/features/game-cache';

export const initialGameSnapshot: ServerGameSnapshot = {
  cards: [
    card('card-earth', '대지의 수호자', 'EARTH', 'NORMAL', 1),
    card('card-water', '심해의 파도', 'WATER', 'RARE', 3),
    card('card-fire', '불꽃 드래곤', 'FIRE', 'LEGENDARY', 9),
  ],
  crystalBalance: 1_000_000,
  packAvailability: {
    packType: 'AD',
    dailyLimit: 20,
    usedToday: 0,
    remainingToday: 20,
    ownedCardCount: 3,
    storageCapacity: 5,
    storageFull: false,
    nextResetAt: '2026-09-11T00:00:00.000Z',
  },
  syncedAt: '2026-09-10T00:00:00.000Z',
};

export async function configureTestRuntime(
  overrides: Partial<GameServerGateway> = {},
): Promise<GameServerGateway> {
  gameRuntime.reset();
  const gateway: GameServerGateway = {
    loadGame: async () => initialGameSnapshot,
    reservePackOpening: async () => {},
    openPack: async () => ({
      card: card('card-wind', '바람의 궁수', 'WIND', 'NORMAL', 1),
      packAvailability: {
        ...initialGameSnapshot.packAvailability,
        usedToday: 1,
        remainingToday: 19,
        ownedCardCount: 4,
      },
    }),
    enhanceCard: async ({ cardId }) => ({
      result: 'SUCCESS',
      card: {
        ...findTestCard(cardId),
        enhancementLevel: 2,
      },
    }),
    sellCards: async ({ cardIds }) => ({
      soldCardIds: cardIds,
      crystalReward: 100_000,
      crystalBalance: 1_100_000,
      packAvailability: {
        ...initialGameSnapshot.packAvailability,
        ownedCardCount: initialGameSnapshot.cards.length - cardIds.length,
        storageFull: false,
      },
    }),
    exchangePoints: async ({ pointAmount }) => ({
      exchangeId: 'exchange-1',
      pointAmount,
      crystalAmount: pointAmount * 10_000,
      crystalBalance: 1_000_000 - pointAmount * 10_000,
      status: 'COMPLETED',
    }),
    ...overrides,
  };
  gameRuntime.configure(gateway);
  await gameRuntime.initialize('test-access-token');
  return gateway;
}

export function findTestCard(cardId: string) {
  const found = initialGameSnapshot.cards.find(
    (card) => card.cardId === cardId,
  );
  if (!found) throw new Error('TEST_CARD_NOT_FOUND');
  return found;
}

function card(
  cardId: string,
  name: string,
  element: ServerGameSnapshot['cards'][number]['element'],
  grade: ServerGameSnapshot['cards'][number]['grade'],
  enhancementLevel: number,
): ServerGameSnapshot['cards'][number] {
  return {
    cardId,
    templateId: `${element}-${grade}`,
    name,
    element,
    grade,
    imageKey: `${element.toLowerCase()}_${grade.toLowerCase()}`,
    enhancementLevel,
    status: 'ENHANCEABLE',
    acquiredAt: '2026-09-10T00:00:00.000Z',
  };
}
