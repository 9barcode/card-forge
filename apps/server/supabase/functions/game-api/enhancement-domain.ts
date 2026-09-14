import { probabilityConfigCache } from '../_shared/probability-config.ts';

const ENHANCEMENT_CONFIG = probabilityConfigCache.enhancementRates;

export type CardGrade = keyof (typeof ENHANCEMENT_CONFIG.levels)['2'];
export const MAX_ENHANCEMENT_LEVEL = ENHANCEMENT_CONFIG.maxLevel;

export function drawEnhancementResult(
  targetLevel: number,
  grade: CardGrade,
  randomTicket: number,
): 'SUCCESS' | 'FAILURE' {
  const level = ENHANCEMENT_CONFIG.levels[
    String(targetLevel) as keyof typeof ENHANCEMENT_CONFIG.levels
  ];
  if (level === undefined) throw new Error('INVALID_TARGET_ENHANCEMENT_LEVEL');
  const rate = level[grade]?.successRatePercent;
  if (rate === undefined) throw new Error('INVALID_CARD_GRADE');
  if (!Number.isInteger(randomTicket) || randomTicket < 0 || randomTicket >= 1_000_000) {
    throw new Error('INVALID_ENHANCEMENT_RANDOM_TICKET');
  }
  const threshold = rate * 10_000;
  return randomTicket < threshold ? 'SUCCESS' : 'FAILURE';
}

export function secureEnhancementTicket(): number {
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / 1_000_000) * 1_000_000;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values); while ((values[0] ?? range) >= limit);
  return (values[0] ?? 0) % 1_000_000;
}
