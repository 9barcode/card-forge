import cardDrawRates from '../../../assets/config/card-draw-rates.json';
import enhancementRates from '../../../assets/config/enhancement-rates.json';
import {
  PROBABILITY_CONFIG_HASH,
  PROBABILITY_CONFIG_VERSION,
} from './probabilityConfig.generated';

/** 앱 번들이 동일한 원본 JSON에서 적재한 읽기 전용 확률 캐시입니다. */
export const probabilityConfigCache = Object.freeze({
  version: PROBABILITY_CONFIG_VERSION,
  hash: PROBABILITY_CONFIG_HASH,
  cardDrawRates,
  enhancementRates,
});

export const probabilityConfigHeaders = Object.freeze({
  'X-Probability-Config-Version': probabilityConfigCache.version,
  'X-Probability-Config-Hash': probabilityConfigCache.hash,
});
