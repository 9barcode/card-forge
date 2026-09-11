import { drawEnhancementResult } from '../../../apps/server/supabase/functions/game-api/enhancement-domain';

describe('Supabase V2 enhancement result', () => {
  it.each([
    [2, 999_999, 'SUCCESS'],
    [3, 899_999, 'SUCCESS'],
    [3, 900_000, 'FAILURE'],
    [9, 331_299, 'SUCCESS'],
    [9, 331_300, 'FAILURE'],
    [10, 199_999, 'SUCCESS'],
    [10, 200_000, 'FAILURE'],
  ] as const)('%i강의 경계 티켓을 판정한다', (level, ticket, expected) => {
    expect(drawEnhancementResult(level, ticket)).toBe(expected);
  });

  it.each([
    [1, 0],
    [11, 0],
    [2, -1],
    [2, 1_000_000],
    [2, 1.5],
  ])('잘못된 단계 또는 난수를 거절한다', (level, ticket) => {
    expect(() => drawEnhancementResult(level, ticket)).toThrow();
  });
});
