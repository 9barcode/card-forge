import { probabilityConfigCache } from '../_shared/probability-config.ts';

const CARD_DRAW_CONFIG = probabilityConfigCache.cardDrawRates;

const gradeOrder = [
  'NORMAL',
  'MAGIC',
  'RARE',
  'SUPER_RARE',
  'UNIQUE',
  'LEGENDARY',
] as const;
const gradeWeights = gradeOrder.map(
  (grade) => CARD_DRAW_CONFIG.grades[grade].weight,
);
export const PACK_PROBABILITY_SCALE = CARD_DRAW_CONFIG.probabilityScale;

if (gradeWeights.reduce((total, weight) => total + weight, 0) !== PACK_PROBABILITY_SCALE) {
  throw new Error('INVALID_CARD_DRAW_GRADE_WEIGHT_TOTAL');
}

export function drawCardTemplateId(randomTicket: number, elementIndex: number): number {
  if (
    !Number.isInteger(randomTicket) ||
    randomTicket < 0 ||
    randomTicket >= PACK_PROBABILITY_SCALE
  ) {
    throw new Error('INVALID_PACK_RANDOM_TICKET');
  }
  if (!Number.isInteger(elementIndex) || elementIndex < 0 || elementIndex >= 6) {
    throw new Error('INVALID_PACK_ELEMENT_INDEX');
  }
  let gradeIndex = 0;
  let upper = gradeWeights[0];
  while (randomTicket >= upper && gradeIndex < gradeWeights.length - 1) {
    gradeIndex += 1;
    upper += gradeWeights[gradeIndex] ?? 0;
  }
  return gradeIndex * 6 + elementIndex + 1;
}

export function secureRandomBelow(exclusiveMax: number): number {
  if (!Number.isInteger(exclusiveMax) || exclusiveMax < 1 || exclusiveMax > 65_536) {
    throw new Error('INVALID_RANDOM_BOUND');
  }
  const limit = Math.floor(65_536 / exclusiveMax) * exclusiveMax;
  const values = new Uint16Array(1);
  do crypto.getRandomValues(values); while ((values[0] ?? 65_536) >= limit);
  return (values[0] ?? 0) % exclusiveMax;
}
