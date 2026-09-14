import { json } from './http.ts';
import {
  CARD_DRAW_CONFIG,
  ENHANCEMENT_CONFIG,
  PROBABILITY_CONFIG_HASH,
  PROBABILITY_CONFIG_VERSION,
} from './probability-config.generated.ts';

/** 함수 인스턴스가 살아 있는 동안 재사용되는 서버 확률 메모리 캐시입니다. */
export const probabilityConfigCache = Object.freeze({
  version: PROBABILITY_CONFIG_VERSION,
  hash: PROBABILITY_CONFIG_HASH,
  cardDrawRates: CARD_DRAW_CONFIG,
  enhancementRates: ENHANCEMENT_CONFIG,
});

export function rejectProbabilityConfigMismatch(
  request: Request,
): Response | null {
  const version = request.headers.get('x-probability-config-version');
  const hash = request.headers.get('x-probability-config-hash');
  if (
    version === probabilityConfigCache.version &&
    hash === probabilityConfigCache.hash
  ) {
    return null;
  }
  return json(
    {
      code: 'PROBABILITY_CONFIG_MISMATCH',
      expectedVersion: probabilityConfigCache.version,
    },
    409,
  );
}
