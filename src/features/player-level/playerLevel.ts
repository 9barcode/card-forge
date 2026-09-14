import levelInfo from '../../../assets/config/level-info.json';

export interface PlayerLevel {
  level: number;
  name: string;
  requiredCrystals: number;
}

const playerLevels: readonly PlayerLevel[] = Object.entries(levelInfo.lv)
  .map(([level, definition]) => ({
    level: Number(level),
    name: definition.name,
    requiredCrystals: definition.누적결정,
  }))
  .sort((left, right) => left.level - right.level);

const defaultPlayerLevel: PlayerLevel = {
  level: 1,
  name: '카드 새싹',
  requiredCrystals: 0,
};

export function getPlayerLevel(totalCrystalsEarned: number): PlayerLevel {
  const earned = Number.isSafeInteger(totalCrystalsEarned)
    ? Math.max(0, totalCrystalsEarned)
    : 0;
  let current = playerLevels[0] ?? defaultPlayerLevel;

  for (const candidate of playerLevels) {
    if (candidate.requiredCrystals > earned) break;
    current = candidate;
  }

  return current;
}

export function getPlayerLevelStarCount(level: number): number {
  const normalizedLevel = Number.isSafeInteger(level) ? Math.max(1, level) : 1;
  return Math.floor(normalizedLevel / 10) + 1;
}
