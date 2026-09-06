import { getCardCrystalValue, getPointQuote, type CardGrade } from '../../../src/services/cardValues';

it.each<[CardGrade, number]>([['NORMAL', 10000], ['MAGIC', 20000], ['RARE', 30000], ['SUPER_RARE', 50000], ['UNIQUE', 70000], ['LEGENDARY', 100000]])('%s의 1~10강 가치를 계산한다', (grade, base) => {
  expect(getCardCrystalValue(grade, 1)).toBe(base);
  expect(getCardCrystalValue(grade, 5)).toBe(base * 5);
  expect(getCardCrystalValue(grade, 10)).toBe(base * 10);
});
it.each([0, 11, -1, 1.5, NaN])('잘못된 강화 단계 %s를 거절한다', (level) => {
  expect(() => getCardCrystalValue('NORMAL', level)).toThrow('INVALID_ENHANCEMENT_LEVEL');
});
it('포인트 교환 시 잔여 결정을 보존한다', () => {
  expect(getPointQuote(25000)).toEqual({ points: 2, cost: 20000, remainder: 5000 });
  expect(getPointQuote(9999)).toEqual({ points: 0, cost: 0, remainder: 9999 });
});
it.each([-1, 1.5, NaN, Infinity])('잘못된 결정 수량 %s를 거절한다', (value) => {
  expect(() => getPointQuote(value)).toThrow('INVALID_CRYSTAL_AMOUNT');
});
