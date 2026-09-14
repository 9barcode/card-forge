import { randomInt } from 'node:crypto';
import type { Element, Grade } from './gameplay.types';
import { ENHANCEMENT_CONFIG } from './probability-config';

export const GAME_RULES_VERSION = 'card-forge-rules-v2';
export const CARD_STORAGE_CAPACITY = 5;
export const DAILY_AD_PACK_LIMIT = 20;
export const CRYSTALS_PER_TOSS_POINT_V2 = 10_000;
export const MIN_ENHANCEMENT_LEVEL = ENHANCEMENT_CONFIG.initialLevel;
export const MAX_ENHANCEMENT_LEVEL = ENHANCEMENT_CONFIG.maxLevel;

export const GRADE_BASE_VALUES: Readonly<Record<Grade, number>> = {
  NORMAL: 10_000,
  MAGIC: 20_000,
  RARE: 30_000,
  SUPER_RARE: 50_000,
  UNIQUE: 70_000,
  LEGENDARY: 100_000,
};

export type ForgeClimate =
  | 'CLEAR'
  | 'CLOUDY'
  | 'RAIN'
  | 'STRONG_WIND'
  | 'HEATWAVE'
  | 'YELLOW_DUST';

export const CLIMATE_ELEMENTS: Readonly<Record<ForgeClimate, Element>> = {
  CLEAR: 'LIGHT',
  CLOUDY: 'DARK',
  RAIN: 'WATER',
  STRONG_WIND: 'WIND',
  HEATWAVE: 'FIRE',
  YELLOW_DUST: 'EARTH',
};

export interface SaleValueInput {
  grade: Grade;
  element: Element;
  enhancementLevel: number;
}

export interface SaleValueResult extends SaleValueInput {
  baseValue: number;
  multiplier: 1 | 1.5;
  crystalReward: number;
}

export function successRateForTargetLevel(
  targetLevel: number,
  grade: Grade,
): number {
  const rate =
    ENHANCEMENT_CONFIG.levels[String(targetLevel)]?.[grade]?.successRatePercent;
  if (rate === undefined) throw new Error('INVALID_TARGET_ENHANCEMENT_LEVEL');
  return rate / 100;
}

export function calculateCardSaleValue(
  card: SaleValueInput,
  bonusElement: Element,
  firstSaleBonusAvailable: boolean,
): SaleValueResult {
  assertEnhancementLevel(card.enhancementLevel);
  const baseValue = GRADE_BASE_VALUES[card.grade];
  const multiplier: 1 | 1.5 =
    firstSaleBonusAvailable && card.element === bonusElement ? 1.5 : 1;
  return {
    ...card,
    baseValue,
    multiplier,
    crystalReward: baseValue * card.enhancementLevel * multiplier,
  };
}

export function calculateBatchSale(
  cards: readonly SaleValueInput[],
  bonusElement: Element,
  firstSaleBonusAvailable: boolean,
): { items: SaleValueResult[]; crystalReward: number } {
  if (cards.length !== CARD_STORAGE_CAPACITY)
    throw new Error('SALE_REQUIRES_FIVE_CARDS');
  const items = cards.map((card) =>
    calculateCardSaleValue(card, bonusElement, firstSaleBonusAvailable),
  );
  return {
    items,
    crystalReward: items.reduce((total, item) => total + item.crystalReward, 0),
  };
}

export function createClimateBag(): ForgeClimate[] {
  const bag = Object.keys(CLIMATE_ELEMENTS) as ForgeClimate[];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const current = bag[index];
    const replacement = bag[swapIndex];
    if (!current || !replacement) throw new Error('INVALID_CLIMATE_BAG');
    bag[index] = replacement;
    bag[swapIndex] = current;
  }
  return bag;
}

function assertEnhancementLevel(level: number): void {
  if (
    !Number.isInteger(level) ||
    level < MIN_ENHANCEMENT_LEVEL ||
    level > MAX_ENHANCEMENT_LEVEL
  )
    throw new Error('INVALID_ENHANCEMENT_LEVEL');
}
