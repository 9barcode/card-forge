import {
  createLocalGameplayTestGateway,
  gameRuntime,
  getAdCompletionProof,
} from '../../../src/features/game-cache';

describe('local gameplay test gateway', () => {
  afterEach(() => gameRuntime.reset());

  it('실서버 모드에서는 실제 광고 완료 ID만 허용한다', () => {
    gameRuntime.configure(createLocalGameplayTestGateway(), 'server');

    expect(() => getAdCompletionProof(undefined)).toThrow(
      'AD_COMPLETION_PROOF_UNAVAILABLE',
    );
    expect(getAdCompletionProof('real-completion-id')).toBe(
      'real-completion-id',
    );
  });

  it('로컬 테스트 모드에서만 테스트용 광고 완료 ID를 만든다', () => {
    gameRuntime.configure(createLocalGameplayTestGateway(), 'local-test');

    expect(getAdCompletionProof(undefined)).toMatch(/^local-test-ad-/);
  });

  it('광고를 중단하고 다시 예약해도 같은 카드를 유지한다', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const random = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.9999);
    const gateway = createLocalGameplayTestGateway(random);

    const first = await gateway.reservePackOpening({
      accessToken: 'local',
      requestId: 'reserve-1',
    });
    const retry = await gateway.reservePackOpening({
      accessToken: 'local',
      requestId: 'reserve-2',
    });

    expect(retry.imageKey).toBe(first.imageKey);
    expect(retry.replayed).toBe(true);
    expect(random).toHaveBeenCalledTimes(1);
    now.mockRestore();
  });

  it.each([
    [0, 'NORMAL'],
    [0.60005, 'MAGIC'],
    [0.93135, 'RARE'],
    [0.99135, 'SUPER_RARE'],
    [0.99565, 'UNIQUE'],
    [0.99895, 'LEGENDARY'],
  ])(
    'JSON 카드 뽑기 확률에서 %s 티켓을 %s 등급으로 판정한다',
    async (randomValue, expectedGrade) => {
      const gateway = createLocalGameplayTestGateway(
        () => randomValue as number,
      );
      await gateway.reservePackOpening({
        accessToken: 'local',
        requestId: `reserve-${expectedGrade}`,
      });
      const opened = await gateway.openPack({
        accessToken: 'local',
        requestId: `draw-${expectedGrade}`,
      });
      expect(opened.card.grade).toBe(expectedGrade);
    },
  );

  it('광고 이후 카드 뽑기, 강화, 판매, 결정 교환 흐름을 캐시용 결과로 만든다', async () => {
    const gateway = createLocalGameplayTestGateway(() => 0);
    await gateway.reservePackOpening({
      accessToken: 'local',
      requestId: 'open-1',
    });
    const opened = await gateway.openPack({
      accessToken: 'local',
      requestId: 'open-1',
      adCompletionId: 'test-ad',
    });
    expect(opened.card.grade).toBe('NORMAL');
    expect(opened.packAvailability.ownedCardCount).toBe(1);

    const enhanced = await gateway.enhanceCard({
      accessToken: 'local',
      requestId: 'enhance-1',
      cardId: opened.card.cardId,
      adCompletionId: 'test-ad',
    });
    expect(enhanced.result).toBe('SUCCESS');
    expect(enhanced.card.enhancementLevel).toBe(2);

    const sold = await gateway.sellCards({
      accessToken: 'local',
      requestId: 'sell-1',
      cardIds: [opened.card.cardId],
      adCompletionId: 'test-ad',
    });
    expect(sold.crystalReward).toBe(20_000);
    expect(sold.packAvailability.ownedCardCount).toBe(0);

    const exchanged = await gateway.exchangePoints({
      accessToken: 'local',
      requestId: 'exchange-1',
      pointAmount: 1,
    });
    expect(exchanged.crystalBalance).toBe(10_000);
    expect(exchanged.status).toBe('TEST_ONLY');
  });
});
