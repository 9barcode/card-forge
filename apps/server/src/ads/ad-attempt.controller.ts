import { Body, Controller, Headers, Inject, Param, Post } from '@nestjs/common';
import * as AdAttempt from './ad-attempt.service';

@Controller('api/v1/ad-attempts')
export class AdAttemptController {
  constructor(
    @Inject(AdAttempt.AdAttemptService)
    private readonly attempts: AdAttempt.AdAttemptService,
  ) {}

  @Post()
  issue(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { purpose?: unknown },
  ) {
    return this.attempts.issue(authorization, body.purpose);
  }

  @Post(':adAttemptId/complete')
  complete(
    @Headers('authorization') authorization: string | undefined,
    @Param('adAttemptId') adAttemptId: string,
    @Body() body: { unitType?: unknown; unitAmount?: unknown },
  ) {
    return this.attempts.complete(
      authorization,
      adAttemptId,
      body.unitType,
      body.unitAmount,
    );
  }
}
