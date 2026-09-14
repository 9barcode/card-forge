import { parseGameInventory } from '../../../apps/server/supabase/functions/game-api/inventory-domain';

const validInventory = {
  userId: '7',
  crystalBalance: '0',
  totalCrystalsEarned: '0',
  cards: [{
    cardId: '11',
    templateId: '4',
    name: '불꽃 기사',
    element: 'FIRE',
    grade: 'NORMAL',
    imageKey:
      'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/webp/flame_knight.webp?v=3',
    enhancementLevel: 1,
    status: 'ENHANCEABLE',
  }],
};

it('DB의 공개 WebP URL을 카드 이미지 참조로 허용한다', () => {
  expect(parseGameInventory(validInventory).cards[0]?.imageKey).toBe(
    validInventory.cards[0].imageKey,
  );
});

it('다른 호스트나 cards/webp 밖의 URL은 거절한다', () => {
  expect(() =>
    parseGameInventory({
      ...validInventory,
      cards: [{
        ...validInventory.cards[0],
        imageKey: 'https://example.com/flame_knight.webp',
      }],
    }),
  ).toThrow('INVALID_CARD_IMAGE');
});
