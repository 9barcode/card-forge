export type CardElement =
  | 'EARTH'
  | 'WATER'
  | 'WIND'
  | 'FIRE'
  | 'LIGHT'
  | 'DARK';

export type CardGrade =
  | 'NORMAL'
  | 'MAGIC'
  | 'RARE'
  | 'SUPER_RARE'
  | 'UNIQUE'
  | 'LEGENDARY';

export type CardStatus =
  | 'ENHANCEABLE'
  | 'ENHANCEMENT_LOCKED'
  | 'MAX_LEVEL'
  | 'DESTROYED'
  | 'SOLD';

export interface CachedOwnedCard {
  cardId: string;
  templateId: string;
  name: string;
  element: CardElement;
  grade: CardGrade;
  imageKey: string;
  enhancementLevel: number;
  status: CardStatus;
  acquiredAt: string;
}

export interface CachedPackAvailability {
  packType: string;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  ownedCardCount: number;
  storageCapacity: number;
  storageFull: boolean;
  nextResetAt: string;
}

export type GameActionKind =
  | 'PACK_OPENING'
  | 'ENHANCEMENT'
  | 'CARD_SALE'
  | 'POINT_EXCHANGE';

export interface PendingGameAction {
  requestId: string;
  kind: GameActionKind;
  startedAt: string;
}

export interface GameCacheError {
  code: string;
  message: string;
}

export interface ServerGameSnapshot {
  cards: readonly CachedOwnedCard[];
  crystalBalance: number;
  packAvailability: CachedPackAvailability;
  syncedAt?: string;
}

export interface ServerPackOpeningResult {
  card: CachedOwnedCard;
  packAvailability: CachedPackAvailability;
}

export interface ServerEnhancementResult {
  card: CachedOwnedCard;
  result: 'SUCCESS' | 'FAILURE';
}

export interface ServerCardSaleResult {
  soldCardIds: readonly string[];
  crystalReward: number;
  crystalBalance: number;
  packAvailability: CachedPackAvailability;
}

export interface ServerPointExchangeResult {
  exchangeId: string;
  pointAmount: number;
  crystalAmount: number;
  crystalBalance: number;
  status: string;
}

export interface GameCacheSnapshot {
  status: 'idle' | 'loading' | 'ready' | 'error';
  cards: readonly CachedOwnedCard[];
  crystalBalance: number | null;
  packAvailability: CachedPackAvailability | null;
  pendingAction: PendingGameAction | null;
  error: GameCacheError | null;
  lastSyncedAt: string | null;
  revision: number;
}

type GameCacheListener = (snapshot: GameCacheSnapshot) => void;

const createInitialSnapshot = (): GameCacheSnapshot => ({
  status: 'idle',
  cards: [],
  crystalBalance: null,
  packAvailability: null,
  pendingAction: null,
  error: null,
  lastSyncedAt: null,
  revision: 0,
});

const copyServerSnapshot = (snapshot: ServerGameSnapshot) => ({
  cards: snapshot.cards.map((card) => ({ ...card })),
  crystalBalance: snapshot.crystalBalance,
  packAvailability: { ...snapshot.packAvailability },
  lastSyncedAt: snapshot.syncedAt ?? new Date().toISOString(),
});

export const createGameCache = () => {
  let current = createInitialSnapshot();
  const listeners = new Set<GameCacheListener>();

  const publish = (next: GameCacheSnapshot) => {
    current = next;
    for (const listener of listeners) {
      listener(current);
    }
  };

  const requirePendingAction = (requestId: string) => {
    if (current.pendingAction?.requestId !== requestId) {
      throw new Error('GAME_ACTION_REQUEST_MISMATCH');
    }
  };

  const requirePendingActionKind = (
    requestId: string,
    kind: GameActionKind,
  ) => {
    requirePendingAction(requestId);
    if (current.pendingAction?.kind !== kind) {
      throw new Error('GAME_ACTION_KIND_MISMATCH');
    }
  };

  return {
    getSnapshot: (): GameCacheSnapshot => current,

    subscribe(listener: GameCacheListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    beginLoad() {
      publish({
        ...current,
        status: 'loading',
        error: null,
        revision: current.revision + 1,
      });
    },

    replaceFromServer(snapshot: ServerGameSnapshot) {
      publish({
        ...current,
        ...copyServerSnapshot(snapshot),
        status: 'ready',
        error: null,
        revision: current.revision + 1,
      });
    },

    failLoad(error: GameCacheError) {
      publish({
        ...current,
        status: 'error',
        error: { ...error },
        revision: current.revision + 1,
      });
    },

    beginAction(action: PendingGameAction) {
      if (current.pendingAction !== null) {
        throw new Error('GAME_ACTION_ALREADY_PENDING');
      }
      publish({
        ...current,
        pendingAction: { ...action },
        error: null,
        revision: current.revision + 1,
      });
    },

    commitAction(requestId: string, snapshot: ServerGameSnapshot) {
      requirePendingAction(requestId);
      publish({
        ...current,
        ...copyServerSnapshot(snapshot),
        status: 'ready',
        pendingAction: null,
        error: null,
        revision: current.revision + 1,
      });
    },

    commitPackOpening(requestId: string, result: ServerPackOpeningResult) {
      requirePendingActionKind(requestId, 'PACK_OPENING');

      const existingCardIndex = current.cards.findIndex(
        (card) => card.cardId === result.card.cardId,
      );
      const cards = current.cards.map((card) => ({ ...card }));
      if (existingCardIndex === -1) {
        cards.push({ ...result.card });
      } else {
        cards[existingCardIndex] = { ...result.card };
      }

      publish({
        ...current,
        status: 'ready',
        cards,
        packAvailability: { ...result.packAvailability },
        pendingAction: null,
        error: null,
        lastSyncedAt: new Date().toISOString(),
        revision: current.revision + 1,
      });
    },

    commitEnhancement(requestId: string, result: ServerEnhancementResult) {
      requirePendingActionKind(requestId, 'ENHANCEMENT');
      const cardIndex = current.cards.findIndex(
        (card) => card.cardId === result.card.cardId,
      );
      if (cardIndex === -1) {
        throw new Error('GAME_CACHE_CARD_NOT_FOUND');
      }
      publish({
        ...current,
        status: 'ready',
        cards: current.cards.map((card, index) =>
          index === cardIndex ? { ...result.card } : { ...card },
        ),
        pendingAction: null,
        error: null,
        lastSyncedAt: new Date().toISOString(),
        revision: current.revision + 1,
      });
    },

    commitCardSale(requestId: string, result: ServerCardSaleResult) {
      requirePendingActionKind(requestId, 'CARD_SALE');
      const soldCardIds = new Set(result.soldCardIds);
      if (
        result.soldCardIds.length < 1 ||
        result.soldCardIds.length > 5 ||
        soldCardIds.size !== result.soldCardIds.length
      ) {
        throw new Error('INVALID_CARD_SALE_RESULT');
      }
      if (
        result.soldCardIds.some(
          (cardId) => !current.cards.some((card) => card.cardId === cardId),
        )
      ) {
        throw new Error('GAME_CACHE_CARD_NOT_FOUND');
      }
      publish({
        ...current,
        status: 'ready',
        cards: current.cards
          .filter((card) => !soldCardIds.has(card.cardId))
          .map((card) => ({ ...card })),
        crystalBalance: result.crystalBalance,
        packAvailability: { ...result.packAvailability },
        pendingAction: null,
        error: null,
        lastSyncedAt: new Date().toISOString(),
        revision: current.revision + 1,
      });
    },

    commitPointExchange(requestId: string, result: ServerPointExchangeResult) {
      requirePendingActionKind(requestId, 'POINT_EXCHANGE');
      publish({
        ...current,
        status: 'ready',
        crystalBalance: result.crystalBalance,
        pendingAction: null,
        error: null,
        lastSyncedAt: new Date().toISOString(),
        revision: current.revision + 1,
      });
    },

    failAction(requestId: string, error: GameCacheError) {
      requirePendingAction(requestId);
      publish({
        ...current,
        status: current.lastSyncedAt === null ? 'error' : 'ready',
        pendingAction: null,
        error: { ...error },
        revision: current.revision + 1,
      });
    },

    clear() {
      publish({ ...createInitialSnapshot(), revision: current.revision + 1 });
    },
  };
};

export type GameCache = ReturnType<typeof createGameCache>;

export const gameCache = createGameCache();
