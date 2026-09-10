import { createLocalGameplayTestGateway } from '../../../src/features/game-cache';

describe('local gameplay test gateway', () => {
  it('광고 이후 카드 뽑기, 강화, 판매, 결정 교환 흐름을 캐시용 결과로 만든다', async () => {
    const gateway = createLocalGameplayTestGateway(() => 0);
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
