import type { Grade } from './gameplay.types';

const CARD_GRADES = [
  'NORMAL',
  'MAGIC',
  'RARE',
  'SUPER_RARE',
  'UNIQUE',
  'LEGENDARY',
] as const satisfies readonly Grade[];

interface CardDrawGradeConfig {
  label: string;
  weight: number;
  drawRatePercent: number;
}

export interface CardDrawConfig {
  version: string;
  rateUnit: 'percent';
  probabilityScale: number;
  grades: Record<Grade, CardDrawGradeConfig>;
}

interface EnhancementGradeConfig {
  successRatePercent: number;
}

export interface EnhancementConfig {
  initialLevel: number;
  maxLevel: number;
  rateUnit: 'percent';
  levels: Record<string, Record<Grade, EnhancementGradeConfig>>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawCardDrawConfig: unknown = require('../../../../assets/config/card-draw-rates.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawEnhancementConfig: unknown = require('../../../../assets/config/enhancement-rates.json');

export const CARD_DRAW_CONFIG = parseCardDrawConfig(rawCardDrawConfig);
export const ENHANCEMENT_CONFIG = parseEnhancementConfig(rawEnhancementConfig);

export function parseCardDrawConfig(value: unknown): CardDrawConfig {
  const config = requireRecord(value, 'INVALID_CARD_DRAW_CONFIG');
  const version = requireNonEmptyString(
    config.version,
    'INVALID_CARD_DRAW_VERSION',
  );
  if (config.rateUnit !== 'percent')
    throw new Error('INVALID_CARD_DRAW_RATE_UNIT');
  const probabilityScale = requirePositiveInteger(
    config.probabilityScale,
    'INVALID_CARD_DRAW_PROBABILITY_SCALE',
  );
  const rawGrades = requireRecord(config.grades, 'INVALID_CARD_DRAW_GRADES');
  assertExactKeys(rawGrades, CARD_GRADES, 'INVALID_CARD_DRAW_GRADE_KEYS');

  const grades = {} as Record<Grade, CardDrawGradeConfig>;
  let totalWeight = 0;
  for (const grade of CARD_GRADES) {
    const rawGrade = requireRecord(rawGrades[grade], 'INVALID_CARD_DRAW_GRADE');
    const weight = requirePositiveInteger(
      rawGrade.weight,
      'INVALID_CARD_DRAW_GRADE_WEIGHT',
    );
    const drawRatePercent = requirePercentage(
      rawGrade.drawRatePercent,
      'INVALID_CARD_DRAW_RATE',
    );
    const calculatedRatePercent = (weight / probabilityScale) * 100;
    if (Math.abs(drawRatePercent - calculatedRatePercent) > 1e-10)
      throw new Error('CARD_DRAW_RATE_WEIGHT_MISMATCH');
    grades[grade] = {
      label: requireNonEmptyString(
        rawGrade.label,
        'INVALID_CARD_DRAW_GRADE_LABEL',
      ),
      weight,
      drawRatePercent,
    };
    totalWeight += weight;
  }
  if (totalWeight !== probabilityScale)
    throw new Error('INVALID_CARD_DRAW_GRADE_WEIGHT_TOTAL');

  return { version, rateUnit: 'percent', probabilityScale, grades };
}

export function parseEnhancementConfig(value: unknown): EnhancementConfig {
  const config = requireRecord(value, 'INVALID_ENHANCEMENT_CONFIG');
  if (config.rateUnit !== 'percent')
    throw new Error('INVALID_ENHANCEMENT_RATE_UNIT');
  const initialLevel = requireNonNegativeInteger(
    config.initialLevel,
    'INVALID_INITIAL_ENHANCEMENT_LEVEL',
  );
  const maxLevel = requirePositiveInteger(
    config.maxLevel,
    'INVALID_MAX_ENHANCEMENT_LEVEL',
  );
  if (initialLevel >= maxLevel)
    throw new Error('INVALID_ENHANCEMENT_LEVEL_RANGE');
  const rawLevels = requireRecord(config.levels, 'INVALID_ENHANCEMENT_LEVELS');
  const expectedLevelKeys = Array.from(
    { length: maxLevel - initialLevel },
    (_, index) => String(initialLevel + index + 1),
  );
  assertExactKeys(
    rawLevels,
    expectedLevelKeys,
    'INVALID_ENHANCEMENT_LEVEL_KEYS',
  );

  const levels = {} as Record<string, Record<Grade, EnhancementGradeConfig>>;
  for (const level of expectedLevelKeys) {
    const rawGradeRates = requireRecord(
      rawLevels[level],
      'INVALID_ENHANCEMENT_LEVEL',
    );
    assertExactKeys(
      rawGradeRates,
      CARD_GRADES,
      'INVALID_ENHANCEMENT_GRADE_KEYS',
    );
    const gradeRates = {} as Record<Grade, EnhancementGradeConfig>;
    for (const grade of CARD_GRADES) {
      const rawGradeRate = requireRecord(
        rawGradeRates[grade],
        'INVALID_ENHANCEMENT_GRADE_RATE',
      );
      gradeRates[grade] = {
        successRatePercent: requirePercentage(
          rawGradeRate.successRatePercent,
          'INVALID_ENHANCEMENT_SUCCESS_RATE',
        ),
      };
    }
    levels[level] = gradeRates;
  }

  return { initialLevel, maxLevel, rateUnit: 'percent', levels };
}

function requireRecord(
  value: unknown,
  errorCode: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(errorCode);
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, errorCode: string): string {
  if (typeof value !== 'string' || value.trim().length === 0)
    throw new Error(errorCode);
  return value;
}

function requireNonNegativeInteger(value: unknown, errorCode: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw new Error(errorCode);
  return value as number;
}

function requirePositiveInteger(value: unknown, errorCode: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0)
    throw new Error(errorCode);
  return value as number;
}

function requirePercentage(value: unknown, errorCode: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  )
    throw new Error(errorCode);
  return value;
}

function assertExactKeys(
  record: Record<string, unknown>,
  expectedKeys: readonly string[],
  errorCode: string,
): void {
  const actualKeys = Object.keys(record).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  )
    throw new Error(errorCode);
}
