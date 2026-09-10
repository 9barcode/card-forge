import { parseGameInventory } from '../../../apps/server/supabase/functions/game-api/inventory-domain';

describe('Supabase inventory response', () => {
  it('DB bigint 문자열과 카드 행을 UI가 사용할 안전한 값으로 변환한다', () => {
    expect(parseGameInventory({
      userId: '7',
      crystalBalance: '10000',
      totalCrystalsEarned: '30000',
      cards: [{
        cardId: '11',
        templateId: '4',
        name: '불꽃 기사',
        element: 'FIRE',
        grade: 'NORMAL',
        imageKey: '/cards/flame_knight.png',
        enhancementLevel: 2,
      }],
    })).toEqual({
      userId: '7',
      crystalBalance: 10000,
      totalCrystalsEarned: 30000,
      cards: [{
        cardId: '11',
        templateId: '4',
        name: '불꽃 기사',
        element: 'FIRE',
        grade: 'NORMAL',
        imageKey: '/cards/flame_knight.png',
        enhancementLevel: 2,
      }],
    });
  });

  it('JavaScript가 정확히 표현할 수 없는 결정 수를 조용히 반올림하지 않는다', () => {
    expect(() => parseGameInventory({
      userId: '7',
      crystalBalance: '9007199254740992',
      totalCrystalsEarned: '9007199254740992',
      cards: [],
    })).toThrow('INVALID_CRYSTAL_BALANCE');
  });

  it('현재 결정이 누적 획득 결정보다 많은 손상된 응답을 거절한다', () => {
    expect(() => parseGameInventory({
      userId: '7',
      crystalBalance: '20000',
      totalCrystalsEarned: '10000',
      cards: [],
    })).toThrow('INVALID_CRYSTAL_TOTAL');
  });

  it('정의되지 않은 원소나 음수 강화 수치를 거절한다', () => {
    const base = {
      userId: '7',
      crystalBalance: '0',
      totalCrystalsEarned: '0',
      cards: [{
        cardId: '11', templateId: '4', name: '오류 카드',
        element: 'ICE', grade: 'NORMAL', imageKey: '', enhancementLevel: -1,
      }],
    };
    expect(() => parseGameInventory(base)).toThrow('INVALID_CARD_ELEMENT');
  });
});
