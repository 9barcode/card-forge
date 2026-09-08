import { useSyncExternalStore } from 'react';
import { type GameCacheSnapshot, gameCache } from './gameCache';

export function useGameCache(): GameCacheSnapshot {
  return useSyncExternalStore(
    gameCache.subscribe,
    gameCache.getSnapshot,
    gameCache.getSnapshot,
  );
}
