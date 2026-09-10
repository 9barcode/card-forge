import { createHttpGameServerGateway } from '../../../src/features/game-cache/httpGameServerGateway';

it('Supabase 보관함 응답을 게임 캐시 스냅샷으로 변환한다', async () => {
  const fetchImplementation = jest.fn(
    async () =>
      new Response(
        JSON.stringify({
          userId: '1',
          crystalBalance: 10000,
          totalCrystalsEarned: 20000,
          syncedAt: '2026-09-11T12:00:00.000Z',
          cards: [
            {
              cardId: '7',
              templateId: '4',
              name: '불꽃 기사',
              element: 'FIRE',
              grade: 'NORMAL',
              imageKey: 'cards/flame_knight.png',
              enhancementLevel: 1,
            },
          ],
        }),
        { status: 200 },
      ),
  );
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: 'https://example.test/',
    fetchImplementation: fetchImplementation as typeof fetch,
  });

  const snapshot = await gateway.loadGame('session-token');
  expect(fetchImplementation).toHaveBeenCalledWith(
    'https://example.test/api/v1/inventory',
    { headers: { Authorization: 'Bearer session-token' } },
  );
  expect(snapshot.crystalBalance).toBe(10000);
  expect(snapshot.cards[0]).toEqual(
    expect.objectContaining({
      cardId: '7',
      imageKey: 'cards/flame_knight.png',
      status: 'ENHANCEABLE',
    }),
  );
  expect(snapshot.packAvailability).toEqual(
    expect.objectContaining({
      dailyLimit: 20,
      ownedCardCount: 1,
      storageFull: false,
    }),
  );
});

it('서버 오류 코드를 호출자에게 전달한다', async () => {
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: 'https://example.test',
    fetchImplementation: (async () =>
      new Response(JSON.stringify({ code: 'INVALID_OR_EXPIRED_SESSION' }), {
        status: 401,
      })) as typeof fetch,
  });
  await expect(gateway.loadGame('expired')).rejects.toThrow(
    'INVALID_OR_EXPIRED_SESSION',
  );
});
