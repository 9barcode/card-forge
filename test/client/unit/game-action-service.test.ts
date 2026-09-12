import {
  type GameServerGateway,
  createGameActionService,
  createGameCache,
} from '../../../src/features/game-cache';
import { findTestCard, initialGameSnapshot } from './game-runtime.fixture';

function gateway(
  overrides: Partial<GameServerGateway> = {},
): GameServerGateway {
  return {
    loadGame: async () => initialGameSnapshot,
    reservePackOpening: async () => ({
      imageKey: 'wind_normal',
      startedAt: '2026-09-10T00:00:00.000Z',
      nextAvailableAt: '2026-09-10T00:01:00.000Z',
      replayed: false,
    }),
    openPack: async () => Promise.reject(new Error('NOT_IMPLEMENTED')),
    enhanceCard: async () => Promise.reject(new Error('NOT_IMPLEMENTED')),
    sellCards: async () => Promise.reject(new Error('NOT_IMPLEMENTED')),
    exchangePoints: async () => Promise.reject(new Error('NOT_IMPLEMENTED')),
    ...overrides,
  };
}

it('앱 시작 시 서버 상태를 한 번 받아 캐시에 저장한다', async () => {
  const cache = createGameCache();
  const loadGame = jest.fn(async () => initialGameSnapshot);
  const actions = createGameActionService({
    cache,
    gateway: gateway({ loadGame }),
  });

  await actions.initialize('access-token');

  expect(loadGame).toHaveBeenCalledTimes(1);
  expect(cache.getSnapshot()).toMatchObject({
    status: 'ready',
    crystalBalance: 1_000_000,
  });
});

it('서버 응답 전에는 카드팩 결과를 캐시에 넣지 않는다', async () => {
  const cache = createGameCache();
  cache.replaceFromServer(initialGameSnapshot);
  let resolveRequest:
    | ((value: Awaited<ReturnType<GameServerGateway['openPack']>>) => void)
    | undefined;
  const openPack = jest.fn(
    () =>
      new Promise<Awaited<ReturnType<GameServerGateway['openPack']>>>(
        (resolve) => {
          resolveRequest = resolve;
        },
      ),
  );
  const actions = createGameActionService({
    cache,
    gateway: gateway({ openPack }),
  });
  const pending = actions.openPack({
    accessToken: 'access-token',
    requestId: 'request-1',
    adCompletionId: 'proof-1234',
  });

  expect(cache.getSnapshot().cards).toHaveLength(3);
  expect(cache.getSnapshot().pendingAction?.kind).toBe('PACK_OPENING');
  if (!resolveRequest) throw new Error('TEST_RESOLVER_NOT_READY');
  resolveRequest({
    card: { ...findTestCard('card-earth'), cardId: 'saved-card' },
    packAvailability: {
      ...initialGameSnapshot.packAvailability,
      ownedCardCount: 4,
    },
  });
  await pending;

  expect(cache.getSnapshot().cards).toHaveLength(4);
  expect(cache.getSnapshot().pendingAction).toBeNull();
});

it('서버 실패 시 기존 캐시를 유지하고 임의 결과를 만들지 않는다', async () => {
  const cache = createGameCache();
  cache.replaceFromServer(initialGameSnapshot);
  const actions = createGameActionService({
    cache,
    gateway: gateway({
      enhanceCard: async () => Promise.reject(new Error('SERVER_DOWN')),
    }),
  });

  await expect(
    actions.enhanceCard({
      accessToken: 'access-token',
      requestId: 'request-2',
      cardId: 'card-earth',
      adCompletionId: 'proof-1234',
    }),
  ).rejects.toThrow('SERVER_DOWN');
  expect(cache.getSnapshot().cards).toEqual(initialGameSnapshot.cards);
  expect(cache.getSnapshot().error?.message).toBe('SERVER_DOWN');
});
