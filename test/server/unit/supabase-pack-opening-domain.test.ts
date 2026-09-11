import { drawCardTemplateId } from '../../../apps/server/supabase/functions/game-api/pack-opening-domain';

describe('Supabase V2 pack opening domain', () => {
  it.each([
    [0, 0, 1],
    [5999, 5, 6],
    [6000, 0, 7],
    [9312, 5, 12],
    [9313, 0, 13],
    [9912, 5, 18],
    [9913, 0, 19],
    [9955, 5, 24],
    [9956, 0, 25],
    [9988, 5, 30],
    [9989, 0, 31],
    [9999, 5, 36],
  ])(
    'ticket %i와 원소 %i를 카드 ID %i로 매핑한다',
    (ticket, element, expected) => {
      expect(drawCardTemplateId(ticket, element)).toBe(expected);
    },
  );
});
