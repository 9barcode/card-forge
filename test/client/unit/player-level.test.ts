import {
  getPlayerLevel,
  getPlayerLevelStarCount,
} from '../../../src/features/player-level/playerLevel';

describe('playerLevel', () => {
  it('누적 결정에 맞는 가장 높은 레벨과 명칭을 반환한다', () => {
    expect(getPlayerLevel(0)).toMatchObject({
      level: 1,
      name: '카드 새싹',
    });
    expect(getPlayerLevel(1_215_000)).toMatchObject({
      level: 10,
      name: '카드 전문가',
    });
    expect(getPlayerLevel(5_415_000)).toMatchObject({
      level: 20,
      name: '카드 대가',
    });
  });

  it('다음 레벨 기준에 못 미치면 현재 레벨을 유지한다', () => {
    expect(getPlayerLevel(1_214_999).level).toBe(9);
  });

  it('별은 1~9레벨 1개, 10레벨부터 10단위로 한 개씩 늘어난다', () => {
    expect(getPlayerLevelStarCount(1)).toBe(1);
    expect(getPlayerLevelStarCount(9)).toBe(1);
    expect(getPlayerLevelStarCount(10)).toBe(2);
    expect(getPlayerLevelStarCount(19)).toBe(2);
    expect(getPlayerLevelStarCount(20)).toBe(3);
    expect(getPlayerLevelStarCount(50)).toBe(6);
  });
});
