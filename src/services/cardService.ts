import type { ImageSourcePropType } from 'react-native';

export interface UserCard {
  id: string;
  name: string;
  element: 'EARTH' | 'WATER' | 'WIND' | 'FIRE' | 'LIGHT' | 'DARK';
  elementLabel: string;
  rarity: 'NORMAL' | 'MAGIC' | 'RARE' | 'SUPER_RARE' | 'UNIQUE' | 'LEGENDARY';
  rarityLabel: string;
  enhanceLevel: number;
  image: ImageSourcePropType;
  description: string;
}

// 보관함 UI 확인용 임시 카드입니다. 실제 데이터 연동 시 API 응답으로 대체합니다.
const previewCards: UserCard[] = [
  { id: '1', name: '대지의 수호자', element: 'EARTH', elementLabel: '땅', rarity: 'NORMAL', rarityLabel: '노말', enhanceLevel: 1, image: require('../../assets/images/cards/earth_normal.png'), description: '단단한 대지의 힘을 품은 카드입니다.' },
  { id: '2', name: '심해의 파도', element: 'WATER', elementLabel: '물', rarity: 'MAGIC', rarityLabel: '매직', enhanceLevel: 2, image: require('../../assets/images/cards/water_magic.png'), description: '깊은 바다의 흐름을 다루는 카드입니다.' },
  { id: '3', name: '질풍의 정령', element: 'WIND', elementLabel: '바람', rarity: 'RARE', rarityLabel: '레어', enhanceLevel: 4, image: require('../../assets/images/cards/wind_rare.png'), description: '빠르고 날카로운 바람의 카드입니다.' },
  { id: '4', name: '불꽃 드래곤', element: 'FIRE', elementLabel: '불', rarity: 'SUPER_RARE', rarityLabel: '슈퍼레어', enhanceLevel: 6, image: require('../../assets/images/cards/fire_super_rare.png'), description: '뜨거운 화염을 내뿜는 드래곤 카드입니다.' },
  { id: '5', name: '찬란한 심판', element: 'LIGHT', elementLabel: '빛', rarity: 'UNIQUE', rarityLabel: '유니크', enhanceLevel: 8, image: require('../../assets/images/cards/light_unique.png'), description: '찬란한 빛으로 어둠을 가르는 카드입니다.' },
];

export const cardService = {
  async getUserCards(): Promise<UserCard[]> {
    return previewCards;
  },
  async getCardDetail(id: string): Promise<UserCard | null> {
    return previewCards.find((card) => card.id === id) ?? null;
  },
};
