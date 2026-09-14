import {
  CARD_DRAW_CONFIG,
  ENHANCEMENT_CONFIG,
  parseCardDrawConfig,
  parseEnhancementConfig,
} from '../../../apps/server/src/cards/probability-config';

// 서버와 같은 파일을 읽어 실제 운영 설정의 참조 관계를 검증한다.
const cardDrawRates: unknown = require('../../../assets/config/card-draw-rates.json');
const enhancementRates: unknown = require('../../../assets/config/enhancement-rates.json');

const cardDrawRatesRecord = cardDrawRates as {
  grades: Record<string, { weight: number; drawRatePercent: number }>;
};
const enhancementRatesRecord = enhancementRates as {
  levels: Record<string, Record<string, { successRatePercent: number }>>;
};

describe('server probability JSON config', () => {
  it('운영 카드 뽑기 설정은 공용 JSON에서 로드한다', () => {
    expect(CARD_DRAW_CONFIG).toEqual(cardDrawRates);
  });

  it('운영 강화 설정은 공용 JSON에서 로드한다', () => {
    expect(ENHANCEMENT_CONFIG).toEqual(enhancementRates);
  });

  it('카드 등급 가중치 합계가 기준값과 다르면 서버 시작을 막는다', () => {
    expect(() =>
      parseCardDrawConfig({
        ...(cardDrawRates as object),
        grades: {
          ...cardDrawRatesRecord.grades,
          NORMAL: {
            ...cardDrawRatesRecord.grades.NORMAL,
            weight: 5_999,
            drawRatePercent: 59.99,
          },
        },
      }),
    ).toThrow('INVALID_CARD_DRAW_GRADE_WEIGHT_TOTAL');
  });

  it('표시 확률과 가중치가 다르면 서버 시작을 막는다', () => {
    expect(() =>
      parseCardDrawConfig({
        ...(cardDrawRates as object),
        grades: {
          ...cardDrawRatesRecord.grades,
          LEGENDARY: {
            ...cardDrawRatesRecord.grades.LEGENDARY,
            drawRatePercent: 1,
          },
        },
      }),
    ).toThrow('CARD_DRAW_RATE_WEIGHT_MISMATCH');
  });

  it('강화 단계가 빠진 JSON은 서버 시작을 막는다', () => {
    const levels = Object.fromEntries(
      Object.entries(enhancementRatesRecord.levels).filter(
        ([level]) => level !== '9',
      ),
    );
    expect(() =>
      parseEnhancementConfig({ ...(enhancementRates as object), levels }),
    ).toThrow('INVALID_ENHANCEMENT_LEVEL_KEYS');
  });

  it('100%를 넘는 강화 확률은 서버 시작을 막는다', () => {
    expect(() =>
      parseEnhancementConfig({
        ...(enhancementRates as object),
        levels: {
          ...enhancementRatesRecord.levels,
          '10': {
            ...enhancementRatesRecord.levels['10'],
            LEGENDARY: { successRatePercent: 100.01 },
          },
        },
      }),
    ).toThrow('INVALID_ENHANCEMENT_SUCCESS_RATE');
  });
});
