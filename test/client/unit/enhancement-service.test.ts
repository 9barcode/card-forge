import {
  enhancementService,
  getEnhancementSuccessRate,
} from '../../../src/services/enhancementService';
import type { CardGrade } from '../../../src/features/game-cache';

const grades: CardGrade[] = [
  'NORMAL',
  'MAGIC',
  'RARE',
  'SUPER_RARE',
  'UNIQUE',
  'LEGENDARY',
];

afterEach(() => jest.restoreAllMocks());

it.each(grades)('%s 등급은 JSON에서 목표 단계의 성공률을 읽는다', (grade) => {
  expect(getEnhancementSuccessRate(1, grade)).toBe(100);
  expect(getEnhancementSuccessRate(8, grade)).toBe(33.13);
  expect(getEnhancementSuccessRate(9, grade)).toBe(20);
});

it('100% 강화는 성공하고 성공 시 한 단계만 오른다', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.999999);
  await expect(
    enhancementService.enhanceCard({
      cardId: '1',
      currentLevel: 1,
      grade: 'NORMAL',
    }),
  ).resolves.toEqual({
    status: 'SUCCESS',
    previousLevel: 1,
    level: 2,
  });
});

it('실패 시 현재 단계를 유지한다', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.9);
  await expect(
    enhancementService.enhanceCard({
      cardId: '1',
      currentLevel: 9,
      grade: 'LEGENDARY',
    }),
  ).resolves.toEqual({ status: 'FAIL', previousLevel: 9, level: 9 });
});

it.each([0, 10, 11, 1.5])(
  '강화 불가능한 단계 %s를 거절한다',
  (level) => {
    expect(() => getEnhancementSuccessRate(level, 'NORMAL')).toThrow(
      'INVALID_ENHANCEMENT_LEVEL',
    );
  },
);
