import type { ImageSourcePropType } from 'react-native';

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

// 화면 개발용 임시 보상. 실제 추첨 확률과 영구 지급은 서버 연동 시 적용합니다.
export const packService = {
  async openPack(_packType: string): Promise<PackReward[]> {
    return [{
      id: 'preview-wind-normal',
      name: '바람 노말',
      element: 'WIND',
      elementLabel: '바람',
      rarity: 'NORMAL',
      rarityLabel: '노말',
      enhanceLevel: 1,
      image: require('../../assets/images/cards/wind_normal.png'),
    }];
  },
};
