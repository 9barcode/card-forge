import type { ImageSourcePropType } from 'react-native';
import { cardService } from './cardService';

export const CARD_STORAGE_CAPACITY = 5;

export interface PackAvailability {
  ownedCardCount: number;
  storageCapacity: number;
  storageFull: boolean;
}

export interface PackReward {
  id: string;
  name: string;
  element: string;
  elementLabel: string;
  rarity: string;
  rarityLabel: string;
  enhanceLevel: number;
  image: ImageSourcePropType;
}

// 서버 주소가 연결되기 전까지 cardService의 임시 카드 목록을 DB 조회 응답처럼 사용합니다.
// 실제 API 연동 시에도 PackAvailability 계약은 그대로 유지합니다.
export const packService = {
  async getAvailability(): Promise<PackAvailability> {
    const cards = await cardService.getUserCards();
    const ownedCardCount = cards.length;
    return {
      ownedCardCount,
      storageCapacity: CARD_STORAGE_CAPACITY,
      storageFull: ownedCardCount >= CARD_STORAGE_CAPACITY,
    };
  },

  async openPack(_packType: string): Promise<PackReward[]> {
    const availability = await this.getAvailability();
    if (availability.storageFull) {
      throw new Error('CARD_STORAGE_FULL');
    }

    return [{
      id: 'preview-wind-normal',
      name: '바람 노말',
      element: 'WIND',
      elementLabel: '바람',
      rarity: 'NORMAL',
      rarityLabel: '노말',
      enhanceLevel: 1,
      image: require('../../assets/images/cards/wind_archer.png'),
    }];
  },
};
