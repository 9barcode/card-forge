import {
  type GameActionService,
  type GameServerGateway,
  createGameActionService,
} from './gameActionService';
import { gameCache } from './gameCache';

const unconfiguredGateway: GameServerGateway = {
  loadGame: reject,
  reservePackOpening: reject,
  openPack: reject,
  enhanceCard: reject,
  sellCards: reject,
  exchangePoints: reject,
};

let actions = createGameActionService({
  cache: gameCache,
  gateway: unconfiguredGateway,
});
let accessToken: string | null = null;
let sequence = 0;
let mode: 'uninitialized' | 'server' | 'local-test' = 'uninitialized';

export const gameRuntime = {
  get actions(): GameActionService {
    return actions;
  },
  configure(
    gateway: GameServerGateway,
    nextMode: 'server' | 'local-test' = 'server',
  ): void {
    actions = createGameActionService({ cache: gameCache, gateway });
    mode = nextMode;
  },
  async initialize(token: string): Promise<void> {
    accessToken = token;
    await actions.initialize(token);
  },
  requireAccessToken(): string {
    if (!accessToken) throw new Error('GAME_SESSION_NOT_INITIALIZED');
    return accessToken;
  },
  nextRequestId(): string {
    sequence += 1;
    return `game-${Date.now()}-${sequence}`;
  },
  isLocalTestMode(): boolean {
    return mode === 'local-test';
  },
  reset(): void {
    accessToken = null;
    sequence = 0;
    mode = 'uninitialized';
    actions = createGameActionService({
      cache: gameCache,
      gateway: unconfiguredGateway,
    });
    gameCache.clear();
  },
};

function reject(): Promise<never> {
  return Promise.reject(new Error('GAME_SERVER_NOT_CONFIGURED'));
}

