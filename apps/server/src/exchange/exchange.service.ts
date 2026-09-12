import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { readTokenDigest, requireRequestId } from '../cards/game-auth';
import { CRYSTALS_PER_TOSS_POINT_V2 } from '../cards/game-rules-v2';
import { GAME_REPOSITORY, type GameRepository } from '../cards/gameplay.types';
import { SERVER_CONFIG, type ServerConfig } from '../config';
import {
  TOSS_MTLS_HTTP_CLIENT,
  type TossMtlsHttpClient,
} from '../toss/toss-mtls-client';

export const CRYSTALS_PER_POINT = CRYSTALS_PER_TOSS_POINT_V2;

@Injectable()
export class ExchangeService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: GameRepository,
    @Inject(SERVER_CONFIG) private readonly config: ServerConfig,
    @Inject(TOSS_MTLS_HTTP_CLIENT)
    private readonly toss: TossMtlsHttpClient,
  ) {}
  async request(
    authorization: string | undefined,
    requestIdHeader: string | undefined,
    pointAmountValue: unknown,
  ) {
    if (!Number.isInteger(pointAmountValue) || Number(pointAmountValue) < 1)
      throw new BadRequestException('INVALID_POINT_AMOUNT');
    const pointAmount = Number(pointAmountValue);
    const tokenDigest = readTokenDigest(authorization, this.config);
    const requestId = requireRequestId(requestIdHeader);

    // 실제 토스포인트가 움직이는 경로만 정식 mTLS 인증을 필수로 확인합니다.
    await this.toss.checkReadiness();

    return this.games.exchange({
      tokenDigest,
      requestId,
      pointAmount,
      crystalAmount: pointAmount * CRYSTALS_PER_POINT,
    });
  }
}
