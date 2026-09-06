import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readTokenDigest } from '../cards/game-auth';
import { GAME_REPOSITORY, type GameRepository } from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import type { AdPurpose } from './ad-attempt.types';

@Injectable()
export class AdAttemptService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
  ) {}

  async issue(authorization: string | undefined, purposeValue: unknown) {
    this.requireClientTestMode();
    const purpose = requireAdPurpose(purposeValue);
    const issuedAt = new Date();
    const notBefore = new Date(
      issuedAt.getTime() + (this.config.adAttemptMinimumSeconds ?? 5) * 1000,
    );
    const expiresAt = new Date(
      issuedAt.getTime() + (this.config.adAttemptTtlSeconds ?? 600) * 1000,
    );
    return this.games.createAdAttempt({
      tokenDigest: readTokenDigest(authorization, this.config),
      adAttemptId: randomUUID(),
      purpose,
      issuedAt,
      notBefore,
      expiresAt,
    });
  }

  async complete(
    authorization: string | undefined,
    adAttemptIdValue: unknown,
    unitTypeValue: unknown,
    unitAmountValue: unknown,
  ) {
    this.requireClientTestMode();
    const adAttemptId = requireAdAttemptId(adAttemptIdValue);
    if (
      typeof unitTypeValue !== 'string' ||
      unitTypeValue.trim().length === 0 ||
      unitTypeValue.length > 80
    ) {
      throw new BadRequestException('INVALID_AD_REWARD_UNIT_TYPE');
    }
    if (
      typeof unitAmountValue !== 'number' ||
      !Number.isFinite(unitAmountValue) ||
      unitAmountValue <= 0
    ) {
      throw new BadRequestException('INVALID_AD_REWARD_UNIT_AMOUNT');
    }
    return this.games.markAdAttemptRewarded({
      tokenDigest: readTokenDigest(authorization, this.config),
      adAttemptId,
    });
  }

  private requireClientTestMode(): void {
    if ((this.config.adRewardMode ?? 'DISABLED') !== 'CLIENT_TEST') {
      throw new ServiceUnavailableException(
        'AD_SERVER_VERIFICATION_UNAVAILABLE',
      );
    }
  }
}

export function requireAdAttemptId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new BadRequestException('INVALID_AD_ATTEMPT_ID');
  }
  return value;
}

function requireAdPurpose(value: unknown): AdPurpose {
  if (value !== 'PACK' && value !== 'ENHANCEMENT' && value !== 'SALE') {
    throw new BadRequestException('INVALID_AD_PURPOSE');
  }
  return value;
}
