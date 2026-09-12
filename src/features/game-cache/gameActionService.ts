import type {
  GameCache,
  GameCacheError,
  ServerCardSaleResult,
  ServerEnhancementResult,
  ServerGameSnapshot,
  ServerPackOpeningResult,
  ServerPointExchangeResult,
} from './gameCache';

export interface AuthorizedCommand {
  accessToken: string;
  requestId: string;
}
export interface OpenPackCommand extends AuthorizedCommand {
  adCompletionId?: string;
}
export interface EnhanceCardCommand extends AuthorizedCommand {
  cardId: string;
  adCompletionId?: string;
}
export interface SellCardsCommand extends AuthorizedCommand {
  cardIds: readonly string[];
  adCompletionId?: string;
}
export interface ExchangePointsCommand extends AuthorizedCommand {
  pointAmount: number;
}

/** 서버가 DB 저장까지 끝낸 확정 결과만 반환하는 경계입니다. */
export interface GameServerGateway {
  loadGame(accessToken: string): Promise<ServerGameSnapshot>;
  reservePackOpening(command: AuthorizedCommand): Promise<void>;
  openPack(command: OpenPackCommand): Promise<ServerPackOpeningResult>;
  enhanceCard(command: EnhanceCardCommand): Promise<ServerEnhancementResult>;
  sellCards(command: SellCardsCommand): Promise<ServerCardSaleResult>;
  exchangePoints(
    command: ExchangePointsCommand,
  ): Promise<ServerPointExchangeResult>;
}

export interface GameActionServiceDependencies {
  cache: GameCache;
  gateway: GameServerGateway;
  now?: () => string;
}

export function createGameActionService({
  cache,
  gateway,
  now = () => new Date().toISOString(),
}: GameActionServiceDependencies) {
  async function run<Result>(
    command: AuthorizedCommand,
    kind: 'PACK_OPENING' | 'ENHANCEMENT' | 'CARD_SALE' | 'POINT_EXCHANGE',
    request: () => Promise<Result>,
    commit: (result: Result) => void,
  ): Promise<Result> {
    cache.beginAction({ requestId: command.requestId, kind, startedAt: now() });
    try {
      const savedResult = await request();
      commit(savedResult);
      return savedResult;
    } catch (error) {
      cache.failAction(command.requestId, toCacheError(error));
      throw error;
    }
  }

  return {
    async initialize(accessToken: string): Promise<ServerGameSnapshot> {
      cache.beginLoad();
      try {
        const snapshot = await gateway.loadGame(accessToken);
        cache.replaceFromServer(snapshot);
        return snapshot;
      } catch (error) {
        cache.failLoad(toCacheError(error));
        throw error;
      }
    },
    reservePackOpening(command: AuthorizedCommand): Promise<void> {
      return gateway.reservePackOpening(command);
    },
    openPack(command: OpenPackCommand): Promise<ServerPackOpeningResult> {
      return run(
        command,
        'PACK_OPENING',
        () => gateway.openPack(command),
        (result) => cache.commitPackOpening(command.requestId, result),
      );
    },
    enhanceCard(command: EnhanceCardCommand): Promise<ServerEnhancementResult> {
      return run(
        command,
        'ENHANCEMENT',
        () => gateway.enhanceCard(command),
        (result) => cache.commitEnhancement(command.requestId, result),
      );
    },
    sellCards(command: SellCardsCommand): Promise<ServerCardSaleResult> {
      return run(
        command,
        'CARD_SALE',
        () => gateway.sellCards(command),
        (result) => cache.commitCardSale(command.requestId, result),
      );
    },
    exchangePoints(
      command: ExchangePointsCommand,
    ): Promise<ServerPointExchangeResult> {
      return run(
        command,
        'POINT_EXCHANGE',
        () => gateway.exchangePoints(command),
        (result) => cache.commitPointExchange(command.requestId, result),
      );
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
