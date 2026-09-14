import { randomInt } from 'node:crypto';
import { Injectable, Optional } from '@nestjs/common';
import type { Element, Grade } from '../cards/gameplay.types';
import { CARD_DRAW_CONFIG } from '../cards/probability-config';
import type { PackRewardPolicy } from './pack-reward.policy';

export const PACK_PROBABILITY_VERSION_V2 = CARD_DRAW_CONFIG.version;
export const PACK_PROBABILITY_SCALE = CARD_DRAW_CONFIG.probabilityScale;

export const PACK_GRADE_WEIGHTS_V2: ReadonlyArray<{
  grade: Grade;
  weight: number;
}> = Object.entries(CARD_DRAW_CONFIG.grades).map(([grade, config]) => ({
  grade: grade as Grade,
  weight: config.weight,
}));

export const PACK_ELEMENTS_V2: ReadonlyArray<Element> = [
  'FIRE',
  'WATER',
  'EARTH',
  'WIND',
  'LIGHT',
  'DARK',
];

type SecureRandomInt = (exclusiveMax: number) => number;

@Injectable()
export class V2PackRewardPolicy implements PackRewardPolicy {
  readonly version = PACK_PROBABILITY_VERSION_V2;

  constructor(
    @Optional() private readonly secureRandomInt: SecureRandomInt = randomInt,
  ) {
    assertV2Configuration();
  }

  draw(): { element: Element; grade: Grade } {
    return {
      grade: drawGrade(this.secureRandomInt(PACK_PROBABILITY_SCALE)),
      element: drawElement(this.secureRandomInt(PACK_ELEMENTS_V2.length)),
    };
  }
}

function drawGrade(ticket: number): Grade {
  assertRandomValue(ticket, PACK_PROBABILITY_SCALE);
  let upperBound = 0;
  for (const entry of PACK_GRADE_WEIGHTS_V2) {
    upperBound += entry.weight;
    if (ticket < upperBound) return entry.grade;
  }
  throw new Error('PACK_GRADE_DRAW_FAILED');
}

function drawElement(index: number): Element {
  assertRandomValue(index, PACK_ELEMENTS_V2.length);
  const element = PACK_ELEMENTS_V2[index];
  if (!element) throw new Error('PACK_ELEMENT_DRAW_FAILED');
  return element;
}

function assertRandomValue(value: number, exclusiveMax: number): void {
  if (!Number.isInteger(value) || value < 0 || value >= exclusiveMax) {
    throw new Error('INVALID_SECURE_RANDOM_VALUE');
  }
}

function assertV2Configuration(): void {
  const total = PACK_GRADE_WEIGHTS_V2.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );
  if (total !== PACK_PROBABILITY_SCALE)
    throw new Error('INVALID_PACK_GRADE_WEIGHT_TOTAL');
  if (PACK_GRADE_WEIGHTS_V2.some((entry) => entry.weight <= 0))
    throw new Error('INVALID_PACK_GRADE_WEIGHT');
  if (new Set(PACK_GRADE_WEIGHTS_V2.map((entry) => entry.grade)).size !== 6)
    throw new Error('DUPLICATE_OR_MISSING_PACK_GRADE');
  if (new Set(PACK_ELEMENTS_V2).size !== 6)
    throw new Error('DUPLICATE_OR_MISSING_PACK_ELEMENT');
}
