import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AdAttemptService } from '../../../apps/server/src/ads/ad-attempt.service';
import type { GameRepository } from '../../../apps/server/src/cards/gameplay.types';
import type { ServerConfig } from '../../../apps/server/src/config';

const authorization = `Bearer ${'a'.repeat(43)}`;
const attemptId = '33333333-3333-4333-8333-333333333333';

function repository(): jest.Mocked<GameRepository> {
  return {
    createAdAttempt: jest.fn(),
    markAdAttemptRewarded: jest.fn(),
    listCards: jest.fn(),
    getCard: jest.fn(),
    sellCard: jest.fn(),
    getPackAvailability: jest.fn(),
    openPack: jest.fn(),
    enhance: jest.fn(),
    exchange: jest.fn(),
    recordAudit: jest.fn(),
  };
}

function config(mode: 'DISABLED' | 'CLIENT_TEST'): ServerConfig {
  return {
    port: 3000,
    databaseUrl: 'postgres://test',
    sessionPepper: 'a'.repeat(32),
    sessionTtlSeconds: 3600,
    tossVerifyUrl: 'https://example.test/verify',
    tossMtlsCertPath: 'cert',
    tossMtlsKeyPath: 'key',
    adRewardMode: mode,
    adAttemptMinimumSeconds: 5,
    adAttemptTtlSeconds: 600,
  };
}

describe('AdAttemptService', () => {
  it('운영 기본 모드에서는 클라이언트 광고 신고 흐름을 닫는다', async () => {
    const games = repository();
    const service = new AdAttemptService(games, config('DISABLED'));
    await expect(service.issue(authorization, 'PACK')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(games.createAdAttempt).not.toHaveBeenCalled();
  });

  it('테스트 모드에서 서버 UUID와 제한 시간을 포함한 시도를 만든다', async () => {
    const games = repository();
    games.createAdAttempt.mockImplementation(async (input) => ({
      adAttemptId: input.adAttemptId,
      purpose: input.purpose,
      status: 'PENDING',
      issuedAt: input.issuedAt.toISOString(),
      notBefore: input.notBefore.toISOString(),
      expiresAt: input.expiresAt.toISOString(),
    }));
    const service = new AdAttemptService(games, config('CLIENT_TEST'));
    const result = await service.issue(authorization, 'PACK');
    expect(result.adAttemptId).toMatch(/^[0-9a-f-]{36}$/i);
    const input = games.createAdAttempt.mock.calls[0]?.[0];
    expect(input?.purpose).toBe('PACK');
    expect(input?.notBefore.getTime()).toBe(input?.issuedAt.getTime() + 5_000);
    expect(input?.expiresAt.getTime()).toBe(
      input?.issuedAt.getTime() + 600_000,
    );
  });

  it('userEarnedReward 값이 유효할 때만 완료 처리를 저장소에 맡긴다', async () => {
    const games = repository();
    games.markAdAttemptRewarded.mockResolvedValue({
      adAttemptId: attemptId,
      purpose: 'PACK',
      status: 'REWARDED',
      issuedAt: new Date(0).toISOString(),
      notBefore: new Date(1).toISOString(),
      expiresAt: new Date(2).toISOString(),
    });
    const service = new AdAttemptService(games, config('CLIENT_TEST'));
    await service.complete(authorization, attemptId, 'reward', 1);
    expect(games.markAdAttemptRewarded).toHaveBeenCalledWith({
      tokenDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      adAttemptId: attemptId,
    });
    await expect(
      service.complete(authorization, attemptId, 'reward', 0),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
