import { createHash } from 'node:crypto';
import {
  probabilityConfigCache,
  rejectProbabilityConfigMismatch,
} from '../../../apps/server/supabase/functions/_shared/probability-config';
import {
  CARD_DRAW_CONFIG,
  ENHANCEMENT_CONFIG,
  PROBABILITY_CONFIG_HASH,
  PROBABILITY_CONFIG_VERSION,
} from '../../../apps/server/supabase/functions/_shared/probability-config.generated';
import {
  PROBABILITY_CONFIG_HASH as APP_CONFIG_HASH,
  PROBABILITY_CONFIG_VERSION as APP_CONFIG_VERSION,
} from '../../../src/features/game-cache/probabilityConfig.generated';

const cardDrawRates: unknown = require('../../../assets/config/card-draw-rates.json');
const enhancementRates: unknown = require('../../../assets/config/enhancement-rates.json');

describe('Supabase probability config', () => {
  it('배포 함수의 카드 뽑기 설정이 원본 JSON과 일치한다', () => {
    expect(CARD_DRAW_CONFIG).toEqual(cardDrawRates);
  });

  it('배포 함수의 강화 설정이 원본 JSON과 일치한다', () => {
    expect(ENHANCEMENT_CONFIG).toEqual(enhancementRates);
  });

  it('앱과 서버 해시가 공용 JSON 전체의 SHA-256과 일치한다', () => {
    const expectedHash = createHash('sha256')
      .update(
        JSON.stringify({
          cardDrawConfig: cardDrawRates,
          enhancementConfig: enhancementRates,
        }),
      )
      .digest('hex');
    expect(APP_CONFIG_VERSION).toBe(PROBABILITY_CONFIG_VERSION);
    expect(APP_CONFIG_HASH).toBe(expectedHash);
    expect(PROBABILITY_CONFIG_HASH).toBe(expectedHash);
  });

  it('동일한 앱 확률 버전과 해시는 요청을 허용한다', () => {
    const request = requestWithConfig(
      probabilityConfigCache.version,
      probabilityConfigCache.hash,
    );
    expect(rejectProbabilityConfigMismatch(request)).toBeNull();
  });

  it.each([
    ['old-version', probabilityConfigCache.hash],
    [probabilityConfigCache.version, '0'.repeat(64)],
    [null, null],
  ])('확률 설정이 불일치하면 카드·강화 요청을 거절한다', (version, hash) => {
    const response = rejectProbabilityConfigMismatch(
      requestWithConfig(version, hash),
    );
    expect(response?.status).toBe(409);
  });

  it('불일치 응답은 설정 오류 코드만 반환하고 확률값은 노출하지 않는다', async () => {
    const response = rejectProbabilityConfigMismatch(
      requestWithConfig('old-version', '0'.repeat(64)),
    );
    await expect(response?.json()).resolves.toEqual({
      code: 'PROBABILITY_CONFIG_MISMATCH',
      expectedVersion: probabilityConfigCache.version,
    });
  });
});

function requestWithConfig(
  version: string | null,
  hash: string | null,
): Request {
  const headers = new Headers();
  if (version) headers.set('x-probability-config-version', version);
  if (hash) headers.set('x-probability-config-hash', hash);
  return new Request('https://example.test/api/v1/pack-openings', { headers });
}
