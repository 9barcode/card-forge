import {
  type PendingGameAction,
  type ServerGameSnapshot,
  createGameCache,
} from '../../../src/features/game-cache';

const action: PendingGameAction = {
  requestId: 'request-1',
  kind: 'PACK_OPENING',
  startedAt: '2026-09-08T00:00:00.000Z',
};

const cachedCard: ServerGameSnapshot['cards'][number] = {
  cardId: 'card-1',
  templateId: 'fire-normal',
  name: '불씨 카드',
  element: 'FIRE',
  grade: 'NORMAL',
  imageKey: 'fire-normal',
  enhancementLevel: 1,
  status: 'ENHANCEABLE',
  acquiredAt: '2026-09-08T00:00:00.000Z',
};

const serverSnapshot: ServerGameSnapshot = {
  cards: [cachedCard],
  crystalBalance: 10_000,
  packAvailability: {
    packType: 'FREE',
    dailyLimit: 20,
    usedToday: 1,
    remainingToday: 19,
    ownedCardCount: 1,
    storageCapacity: 5,
    storageFull: false,
    nextResetAt: '2026-09-09T00:00:00.000Z',
  },
  syncedAt: '2026-09-08T00:00:01.000Z',
};

describe('gameCache', () => {
  it('로그인한 회원 프로필을 캐시에 저장한다', () => {
    const cache = createGameCache();

    cache.setCurrentUser({
      userId: 'user-001',
      displayName: '초보 대장장이',
      accountStatus: 'ACTIVE',
      createdAt: '2026-09-11T00:00:00.000Z',
      lastSignedInAt: '2026-09-11T00:00:00.000Z',
    });

    expect(cache.getSnapshot().currentUser?.displayName).toBe('초보 대장장이');
  });

  it('서버 스냅샷을 캐시에 저장하고 구독자에게 알린다', () => {
    const cache = createGameCache();
    const listener = jest.fn();
    cache.subscribe(listener);

    cache.beginLoad();
    cache.replaceFromServer(serverSnapshot);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(cache.getSnapshot()).toMatchObject({
      status: 'ready',
      cards: serverSnapshot.cards,
      crystalBalance: 10_000,
      packAvailability: serverSnapshot.packAvailability,
      lastSyncedAt: serverSnapshot.syncedAt,
    });
  });

  it('새로 불러오는 동안 기존 확정 데이터를 유지한다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);

    cache.beginLoad();

    expect(cache.getSnapshot().status).toBe('loading');
    expect(cache.getSnapshot().cards).toEqual(serverSnapshot.cards);
    expect(cache.getSnapshot().crystalBalance).toBe(10_000);
  });

  it('행동 결과는 서버 응답을 받은 뒤에만 확정한다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);
    cache.beginAction(action);

    expect(cache.getSnapshot().cards).toHaveLength(1);
    expect(cache.getSnapshot().pendingAction).toEqual(action);

    cache.commitAction('request-1', {
      ...serverSnapshot,
      cards: [...serverSnapshot.cards, { ...cachedCard, cardId: 'card-2' }],
      packAvailability: {
        ...serverSnapshot.packAvailability,
        usedToday: 2,
        remainingToday: 18,
      },
    });

    expect(cache.getSnapshot().cards).toHaveLength(2);
    expect(cache.getSnapshot().pendingAction).toBeNull();
  });

  it('서버가 DB에 저장해 반환한 카드만 캐시에 추가한다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);
    cache.beginAction(action);

    const savedCard = { ...cachedCard, cardId: 'database-card-2' };
    cache.commitPackOpening('request-1', {
      card: savedCard,
      packAvailability: {
        ...serverSnapshot.packAvailability,
        usedToday: 2,
        remainingToday: 18,
        ownedCardCount: 2,
      },
    });

    expect(cache.getSnapshot().cards).toEqual([cachedCard, savedCard]);
    expect(cache.getSnapshot().packAvailability).toMatchObject({
      usedToday: 2,
      ownedCardCount: 2,
    });
    expect(cache.getSnapshot().pendingAction).toBeNull();
  });

  it('같은 서버 응답을 재수신해도 카드를 중복 추가하지 않는다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);
    cache.beginAction(action);

    cache.commitPackOpening('request-1', {
      card: { ...cachedCard, enhancementLevel: 2 },
      packAvailability: serverSnapshot.packAvailability,
    });

    expect(cache.getSnapshot().cards).toHaveLength(1);
    expect(cache.getSnapshot().cards[0]?.enhancementLevel).toBe(2);
  });

  it('카드팩 요청이 아닌 행동에는 카드팩 결과를 적용하지 않는다', () => {
    const cache = createGameCache();
    cache.beginAction({ ...action, kind: 'ENHANCEMENT' });

    expect(() =>
      cache.commitPackOpening('request-1', {
        card: cachedCard,
        packAvailability: serverSnapshot.packAvailability,
      }),
    ).toThrow('GAME_ACTION_KIND_MISMATCH');
  });

  it('서버가 반환한 강화 성공 카드를 같은 위치에 반영한다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);
    cache.beginAction({ ...action, kind: 'ENHANCEMENT' });

    cache.commitEnhancement('request-1', {
      card: { ...cachedCard, enhancementLevel: 2 },
      result: 'SUCCESS',
    });

    expect(cache.getSnapshot().cards).toEqual([
      { ...cachedCard, enhancementLevel: 2 },
    ]);
    expect(cache.getSnapshot().pendingAction).toBeNull();
  });

  it('강화 실패로 잠긴 카드 상태를 서버 결과대로 반영한다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);
    cache.beginAction({ ...action, kind: 'ENHANCEMENT' });

    cache.commitEnhancement('request-1', {
      card: { ...cachedCard, status: 'ENHANCEMENT_LOCKED' },
      result: 'FAILURE',
    });

    expect(cache.getSnapshot().cards[0]?.status).toBe('ENHANCEMENT_LOCKED');
  });

  it('선택한 카드 1장 판매 결과로 카드와 결정 잔액을 갱신한다', () => {
    const cache = createGameCache();
    const fiveCards = Array.from({ length: 5 }, (_, index) => ({
      ...cachedCard,
      cardId: `card-${index + 1}`,
    }));
    cache.replaceFromServer({ ...serverSnapshot, cards: fiveCards });
    cache.beginAction({ ...action, kind: 'CARD_SALE' });

    cache.commitCardSale('request-1', {
      soldCardIds: ['card-3'],
      crystalReward: 10_000,
      crystalBalance: 20_000,
      packAvailability: {
        ...serverSnapshot.packAvailability,
        ownedCardCount: 4,
        storageFull: false,
      },
    });

    expect(cache.getSnapshot()).toMatchObject({
      crystalBalance: 20_000,
      pendingAction: null,
      packAvailability: { ownedCardCount: 4, storageFull: false },
    });
    expect(cache.getSnapshot().cards.map((card) => card.cardId)).toEqual([
      'card-1',
      'card-2',
      'card-4',
      'card-5',
    ]);
  });

  it('선택한 카드 5장을 한 번에 판매한 결과도 반영한다', () => {
    const cache = createGameCache();
    const fiveCards = Array.from({ length: 5 }, (_, index) => ({
      ...cachedCard,
      cardId: `card-${index + 1}`,
    }));
    cache.replaceFromServer({ ...serverSnapshot, cards: fiveCards });
    cache.beginAction({ ...action, kind: 'CARD_SALE' });

    cache.commitCardSale('request-1', {
      soldCardIds: fiveCards.map((card) => card.cardId),
      crystalReward: 50_000,
      crystalBalance: 60_000,
      packAvailability: {
        ...serverSnapshot.packAvailability,
        ownedCardCount: 0,
        storageFull: false,
      },
    });

    expect(cache.getSnapshot()).toMatchObject({
      cards: [],
      crystalBalance: 60_000,
      packAvailability: { ownedCardCount: 0 },
    });
  });

  it('판매 결과는 중복 없이 1~5장이어야 한다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);
    cache.beginAction({ ...action, kind: 'CARD_SALE' });

    expect(() =>
      cache.commitCardSale('request-1', {
        soldCardIds: [],
        crystalReward: 0,
        crystalBalance: 10_000,
        packAvailability: serverSnapshot.packAvailability,
      }),
    ).toThrow('INVALID_CARD_SALE_RESULT');
  });

  it('강화는 한 카드의 결과만 반영한다', () => {
    const cache = createGameCache();
    const cards = [cachedCard, { ...cachedCard, cardId: 'card-2' }];
    cache.replaceFromServer({ ...serverSnapshot, cards });
    cache.beginAction({ ...action, kind: 'ENHANCEMENT' });

    cache.commitEnhancement('request-1', {
      card: { ...cachedCard, enhancementLevel: 2 },
      result: 'SUCCESS',
    });

    expect(cache.getSnapshot().cards).toEqual([
      { ...cachedCard, enhancementLevel: 2 },
      cards[1],
    ]);
  });

  it('포인트 교환 후 서버가 반환한 결정 잔액을 반영한다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);
    cache.beginAction({ ...action, kind: 'POINT_EXCHANGE' });

    cache.commitPointExchange('request-1', {
      exchangeId: 'exchange-1',
      pointAmount: 1,
      crystalAmount: 10_000,
      crystalBalance: 0,
      status: 'COMPLETED',
    });

    expect(cache.getSnapshot()).toMatchObject({
      crystalBalance: 0,
      pendingAction: null,
    });
  });

  it('서버 행동 실패 시 기존 확정 데이터를 보존한다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);
    cache.beginAction(action);

    cache.failAction('request-1', {
      code: 'SERVER_ERROR',
      message: '잠시 후 다시 시도해 주세요.',
    });

    expect(cache.getSnapshot()).toMatchObject({
      status: 'ready',
      cards: serverSnapshot.cards,
      crystalBalance: 10_000,
      pendingAction: null,
      error: { code: 'SERVER_ERROR' },
    });
  });

  it('동시에 두 서버 행동을 시작하지 못하게 막는다', () => {
    const cache = createGameCache();
    cache.beginAction(action);

    expect(() =>
      cache.beginAction({ ...action, requestId: 'request-2' }),
    ).toThrow('GAME_ACTION_ALREADY_PENDING');
  });

  it('다른 요청의 늦은 응답이 현재 캐시를 덮어쓰지 못하게 막는다', () => {
    const cache = createGameCache();
    cache.beginAction(action);

    expect(() => cache.commitAction('old-request', serverSnapshot)).toThrow(
      'GAME_ACTION_REQUEST_MISMATCH',
    );
  });

  it('로그아웃 시 사용자 게임 상태를 비운다', () => {
    const cache = createGameCache();
    cache.replaceFromServer(serverSnapshot);

    cache.clear();

    expect(cache.getSnapshot()).toMatchObject({
      status: 'idle',
      cards: [],
      crystalBalance: null,
      packAvailability: null,
      pendingAction: null,
      error: null,
      lastSyncedAt: null,
    });
  });
});
