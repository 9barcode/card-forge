import { enhancementService, getEnhancementSuccessRate } from '../../../src/services/enhancementService';
afterEach(() => jest.restoreAllMocks());
it('JSON에서 목표 단계의 성공률을 읽는다', () => {
  expect(getEnhancementSuccessRate(1)).toBe(100);
  expect(getEnhancementSuccessRate(8)).toBe(33.13);
  expect(getEnhancementSuccessRate(9)).toBe(20);
});
it('100% 강화는 성공하고 성공 시 한 단계만 오른다', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.999999);
  await expect(enhancementService.enhanceCard({ cardId: '1', currentLevel: 1 })).resolves.toEqual({ status: 'SUCCESS', previousLevel: 1, level: 2 });
});
it('실패 시 현재 단계를 유지한다', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.9);
  await expect(enhancementService.enhanceCard({ cardId: '1', currentLevel: 9 })).resolves.toEqual({ status: 'FAIL', previousLevel: 9, level: 9 });
});
it.each([0, 10, 11, 1.5])('강화 불가능한 단계 %s를 거절한다', (level) => {
  expect(() => getEnhancementSuccessRate(level)).toThrow('INVALID_ENHANCEMENT_LEVEL');
});
