import rates from '../../assets/config/enhancement-rates.json';
import type { CardGrade } from '../features/game-cache/gameCache';

export interface EnhancementResult {
  status: 'SUCCESS' | 'FAIL';
  previousLevel: number;
  level: number;
}

type GradeRate = {
  successRatePercent: number;
};

export const MAX_ENHANCEMENT_LEVEL = rates.maxLevel;

export function getEnhancementSuccessRate(
  currentLevel: number,
  grade: CardGrade,
): number {
  if (
    !Number.isInteger(currentLevel) ||
    currentLevel < rates.initialLevel ||
    currentLevel >= rates.maxLevel
  ) {
    throw new Error('INVALID_ENHANCEMENT_LEVEL');
  }
  const levelRates = (
    rates.levels as Record<string, Record<CardGrade, GradeRate>>
  )[String(currentLevel + 1)];
  const rate = levelRates?.[grade]?.successRatePercent;
  if (
    rate === undefined ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 100
  ) {
    throw new Error('INVALID_ENHANCEMENT_RATE');
  }
  return rate;
}

// 임시 카드용 로컬 시뮬레이션. 운영 강화 결과와 저장은 서버에서 처리해야 합니다.
export const enhancementService = {
  async enhanceCard({
    currentLevel,
    grade,
  }: {
    cardId: string;
    currentLevel: number;
    grade: CardGrade;
  }): Promise<EnhancementResult> {
    const rate = getEnhancementSuccessRate(currentLevel, grade);
    const success = Math.random() * 100 < rate;
    return {
      status: success ? 'SUCCESS' : 'FAIL',
      previousLevel: currentLevel,
      level: success ? currentLevel + 1 : currentLevel,
    };
  },
};
