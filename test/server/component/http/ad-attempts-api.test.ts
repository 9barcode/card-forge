import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdAttemptController } from '../../../../apps/server/src/ads/ad-attempt.controller';
import { AdAttemptService } from '../../../../apps/server/src/ads/ad-attempt.service';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../../../apps/server/src/cards/gameplay.types';
import {
  SERVER_CONFIG,
  type ServerConfig,
} from '../../../../apps/server/src/config';

const authorization = `Bearer ${'a'.repeat(43)}`;
const adAttemptId = '33333333-3333-4333-8333-333333333333';
const config: ServerConfig = {
  port: 3000,
  databaseUrl: 'postgres://test',
  sessionPepper: 'a'.repeat(32),
  sessionTtlSeconds: 3600,
  tossVerifyUrl: 'https://example.test/verify',
  tossMtlsCertPath: 'cert',
  tossMtlsKeyPath: 'key',
  adRewardMode: 'CLIENT_TEST',
  adAttemptMinimumSeconds: 0,
  adAttemptTtlSeconds: 600,
};

describe('ad attempt HTTP component', () => {
  let app: INestApplication;
  let baseUrl: string;
  const repository = {
    createAdAttempt: jest.fn(),
    markAdAttemptRewarded: jest.fn(),
  } as unknown as jest.Mocked<GameRepository>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdAttemptController],
      providers: [
        AdAttemptService,
        { provide: GAME_REPOSITORY, useValue: repository },
        { provide: SERVER_CONFIG, useValue: config },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('광고 시도를 발급하고 userEarnedReward 신고를 받는다', async () => {
    repository.createAdAttempt.mockImplementation(async (input) => ({
      adAttemptId: input.adAttemptId,
      purpose: input.purpose,
      status: 'PENDING',
      issuedAt: input.issuedAt.toISOString(),
      notBefore: input.notBefore.toISOString(),
      expiresAt: input.expiresAt.toISOString(),
    }));
    repository.markAdAttemptRewarded.mockResolvedValue({
      adAttemptId,
      purpose: 'PACK',
      status: 'REWARDED',
      issuedAt: new Date(0).toISOString(),
      notBefore: new Date(0).toISOString(),
      expiresAt: new Date(60_000).toISOString(),
    });

    const issued = await fetch(`${baseUrl}/api/v1/ad-attempts`, {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ purpose: 'PACK' }),
    });
    expect(issued.status).toBe(201);
    expect(repository.createAdAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'PACK',
        tokenDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );

    const completed = await fetch(
      `${baseUrl}/api/v1/ad-attempts/${adAttemptId}/complete`,
      {
        method: 'POST',
        headers: { authorization, 'content-type': 'application/json' },
        body: JSON.stringify({ unitType: 'card', unitAmount: 1 }),
      },
    );
    expect(completed.status).toBe(201);
    expect(repository.markAdAttemptRewarded).toHaveBeenCalledWith({
      adAttemptId,
      tokenDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });
});
