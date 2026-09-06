import config from '../../assets/config/card-values.json';

export type CardGrade = keyof typeof config.grades;
export const cardValues = config;

export function getCardCrystalValue(grade: CardGrade, level: number): number {
  if (!Number.isInteger(level) || level < config.enhancement.min || level > config.enhancement.max) {
    throw new Error('INVALID_ENHANCEMENT_LEVEL');
  }
  const value = config.grades[grade]?.baseCrystals;
  if (!Number.isSafeInteger(value) || value <= 0 || !Number.isSafeInteger(value * level)) {
    throw new Error('INVALID_CARD_VALUE');
  }
  return value * level;
}

export function getPointQuote(crystals: number) {
  const rate = config.crystalsPerPoint;
  if (!Number.isSafeInteger(rate) || rate <= 0) throw new Error('INVALID_POINT_RATE');
  if (!Number.isSafeInteger(crystals) || crystals < 0) throw new Error('INVALID_CRYSTAL_AMOUNT');
  const points = Math.floor(crystals / rate);
  return { points, cost: points * rate, remainder: crystals % rate };
}
