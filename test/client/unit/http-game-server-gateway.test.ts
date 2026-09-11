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

it('광고 완료 증명과 중복 방지 키로 카드 뽑기를 요청한다', async () => {
  const fetchImplementation = jest.fn(
    async () =>
      new Response(
        JSON.stringify({
          card: {
            cardId: '8',
            templateId: '4',
            name: '불꽃 기사',
            element: 'FIRE',
            grade: 'NORMAL',
            imageKey: 'cards/flame_knight.png',
            enhancementLevel: 1,
            status: 'ENHANCEABLE',
            acquiredAt: '2026-09-11T12:00:00.000Z',
          },
          packAvailability: {
            packType: 'AD',
            dailyLimit: 20,
            usedToday: 1,
            remainingToday: 19,
            ownedCardCount: 2,
            storageCapacity: 5,
            storageFull: false,
            nextResetAt: '2026-09-12T15:00:00.000Z',
          },
          replayed: false,
        }),
        { status: 201 },
      ),
  );
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: 'https://example.test',
    fetchImplementation: fetchImplementation as typeof fetch,
  });

  const result = await gateway.openPack({
    accessToken: 'session-token',
    requestId: 'game-request-001',
    adCompletionId: 'ad-completion-001',
  });

  expect(fetchImplementation).toHaveBeenCalledWith(
    'https://example.test/api/v1/pack-openings',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'game-request-001',
      },
      body: JSON.stringify({ adCompletionId: 'ad-completion-001' }),
    },
  );
  expect(result).toEqual(
    expect.objectContaining({
      card: expect.objectContaining({ cardId: '8', status: 'ENHANCEABLE' }),
      packAvailability: expect.objectContaining({
        usedToday: 1,
        remainingToday: 19,
        ownedCardCount: 2,
      }),
    }),
  );
});

it('카드 뽑기 실패 응답은 성공 결과로 변환하지 않는다', async () => {
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: 'https://example.test',
    fetchImplementation: (async () =>
      new Response(JSON.stringify({ code: 'CARD_STORAGE_FULL' }), {
        status: 409,
      })) as typeof fetch,
  });

  await expect(
    gateway.openPack({
      accessToken: 'session-token',
      requestId: 'game-request-002',
      adCompletionId: 'ad-completion-002',
    }),
  ).rejects.toThrow('CARD_STORAGE_FULL');
});

it('서버 카드팩 상태 합계가 맞지 않으면 응답을 거절한다', async () => {
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: 'https://example.test',
    fetchImplementation: (async () =>
      new Response(
        JSON.stringify({
          card: {
            cardId: '8',
            templateId: '4',
            name: '불꽃 기사',
            element: 'FIRE',
            grade: 'NORMAL',
            imageKey: 'cards/flame_knight.png',
            enhancementLevel: 1,
          },
          packAvailability: {
            packType: 'AD',
            dailyLimit: 20,
            usedToday: 1,
            remainingToday: 20,
            ownedCardCount: 2,
            storageCapacity: 5,
            storageFull: false,
            nextResetAt: '2026-09-12T15:00:00.000Z',
          },
        }),
        { status: 201 },
      )) as typeof fetch,
  });

  await expect(
    gateway.openPack({
      accessToken: 'session-token',
      requestId: 'game-request-003',
      adCompletionId: 'ad-completion-003',
    }),
  ).rejects.toThrow('INVALID_GAME_API_RESPONSE');
});

it('선택한 카드와 광고 완료 증명으로 강화를 요청한다', async () => {
  const fetchImplementation = jest.fn(
    async () =>
      new Response(
        JSON.stringify({
          card: {
            cardId: '8',
            templateId: '4',
            name: '불꽃 기사',
            element: 'FIRE',
            grade: 'NORMAL',
            imageKey: 'cards/flame_knight.png',
            enhancementLevel: 2,
            status: 'ENHANCEABLE',
            acquiredAt: '',
          },
          result: 'SUCCESS',
          replayed: false,
        }),
        { status: 200 },
      ),
  );
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: 'https://example.test',
    fetchImplementation: fetchImplementation as typeof fetch,
  });

  const result = await gateway.enhanceCard({
    accessToken: 'session-token',
    requestId: 'enhance-request-001',
    cardId: '8',
    adCompletionId: 'ad-completion-001',
  });

  expect(fetchImplementation).toHaveBeenCalledWith(
    'https://example.test/api/v1/enhancements',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer session-token',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'enhance-request-001',
      },
      body: JSON.stringify({
        cardId: '8',
        adCompletionId: 'ad-completion-001',
      }),
    },
  );
  expect(result).toEqual(
    expect.objectContaining({
      result: 'SUCCESS',
      card: expect.objectContaining({ cardId: '8', enhancementLevel: 2 }),
    }),
  );
});

it('강화 실패와 영구 잠금을 서버 결과 그대로 반환한다', async () => {
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: 'https://example.test',
    fetchImplementation: (async () =>
      new Response(
        JSON.stringify({
          card: {
            cardId: '8',
            templateId: '4',
            name: '불꽃 기사',
            element: 'FIRE',
            grade: 'NORMAL',
            imageKey: 'cards/flame_knight.png',
            enhancementLevel: 2,
            status: 'ENHANCEMENT_LOCKED',
            acquiredAt: '',
          },
          result: 'FAILURE',
        }),
        { status: 200 },
      )) as typeof fetch,
  });

  await expect(
    gateway.enhanceCard({
      accessToken: 'session-token',
      requestId: 'enhance-request-002',
      cardId: '8',
      adCompletionId: 'ad-completion-002',
    }),
  ).resolves.toEqual(
    expect.objectContaining({
      result: 'FAILURE',
      card: expect.objectContaining({ status: 'ENHANCEMENT_LOCKED' }),
    }),
  );
});

it('강화 결과와 카드 상태가 모순되면 응답을 거절한다', async () => {
  const gateway = createHttpGameServerGateway({
    apiBaseUrl: 'https://example.test',
    fetchImplementation: (async () =>
      new Response(
        JSON.stringify({
          card: {
            cardId: '8',
            templateId: '4',
            name: '불꽃 기사',
            element: 'FIRE',
            grade: 'NORMAL',
            imageKey: 'cards/flame_knight.png',
            enhancementLevel: 2,
            status: 'ENHANCEMENT_LOCKED',
            acquiredAt: '',
          },
          result: 'SUCCESS',
        }),
        { status: 200 },
      )) as typeof fetch,
  });

  await expect(
    gateway.enhanceCard({
      accessToken: 'session-token',
      requestId: 'enhance-request-003',
      cardId: '8',
      adCompletionId: 'ad-completion-003',
    }),
  ).rejects.toThrow('INVALID_GAME_API_RESPONSE');
});
