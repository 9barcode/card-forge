import type {
  GameCache,
  GameCacheError,
  ServerPackOpeningResult,
} from './gameCache';

export interface OpenPackCommand {
  accessToken: string;
  requestId: string;
  adCompletionId: string;
}

export interface PackOpeningGateway {
  openPack(command: OpenPackCommand): Promise<ServerPackOpeningResult>;
}

export interface GameActionServiceDependencies {
  cache: GameCache;
  packOpeningGateway: PackOpeningGateway;
  now?: () => string;
}

export function createGameActionService({
  cache,
  packOpeningGateway,
  now = () => new Date().toISOString(),
}: GameActionServiceDependencies) {
  return {
    async openPack(command: OpenPackCommand): Promise<ServerPackOpeningResult> {
      cache.beginAction({
        requestId: command.requestId,
        kind: 'PACK_OPENING',
        startedAt: now(),
      });

      try {
        const savedResult = await packOpeningGateway.openPack(command);
        cache.commitPackOpening(command.requestId, savedResult);
        return savedResult;
      } catch (error) {
        cache.failAction(command.requestId, toCacheError(error));
        throw error;
      }
    },
  };
}

function toCacheError(error: unknown): GameCacheError {
  if (error instanceof Error && error.message.trim().length > 0) {
    return { code: 'GAME_API_REQUEST_FAILED', message: error.message };
  }
  return {
    code: 'GAME_API_REQUEST_FAILED',
    message: '게임 서버 요청에 실패했습니다.',
  };
}

export type GameActionService = ReturnType<typeof createGameActionService>;
