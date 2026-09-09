import {
  type GameActionService,
  type GameServerGateway,
  createGameActionService,
} from './gameActionService';
import { gameCache } from './gameCache';

const unconfiguredGateway: GameServerGateway = {
  loadGame: reject,
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

export const gameRuntime = {
  get actions(): GameActionService {
    return actions;
  },
  configure(gateway: GameServerGateway): void {
    actions = createGameActionService({ cache: gameCache, gateway });
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
  reset(): void {
    accessToken = null;
    sequence = 0;
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

export function requireAdCompletionId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('AD_COMPLETION_PROOF_UNAVAILABLE');
  }
  return value;
}
