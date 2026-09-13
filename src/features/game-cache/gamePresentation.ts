import { Image, type ImageSourcePropType } from 'react-native';
import type { CardElement, CardGrade } from './gameCache';

export const elementLabels: Record<CardElement, string> = {
  EARTH: '땅',
  WATER: '물',
  WIND: '바람',
  FIRE: '불',
  LIGHT: '빛',
  DARK: '어둠',
};

export const gradeLabels: Record<CardGrade, string> = {
  NORMAL: '노말',
  MAGIC: '매직',
  RARE: '레어',
  SUPER_RARE: '슈퍼레어',
  UNIQUE: '유니크',
  LEGENDARY: '레전더리',
};

const SUPABASE_PUBLIC_IMAGE_BASE_URL =
  'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images';
// 같은 경로의 이미지를 교체하면 이 값을 올려 장기 캐시 URL을 갱신합니다.
const CARD_IMAGE_CACHE_VERSION = '2';

export type CardImageVariant = 'full' | 'thumbnail';

const fallbackCardImage: ImageSourcePropType = require('../../../assets/images/cards/earth_guardian.png');
const cardImages: Record<string, ImageSourcePropType> = {
  earth_guardian: fallbackCardImage,
  deep_sea_wave: require('../../../assets/images/cards/deep_sea_wave.png'),
  gale_spirit: require('../../../assets/images/cards/gale_spirit.png'),
  flame_dragon: require('../../../assets/images/cards/flame_dragon.png'),
  radiant_judgment: require('../../../assets/images/cards/radiant_judgment.png'),
  abyss_lord: require('../../../assets/images/cards/abyss_lord.png'),
  earth_normal: fallbackCardImage,
  water_rare: require('../../../assets/images/cards/frost_witch.png'),
  wind_normal: require('../../../assets/images/cards/wind_archer.png'),
  fire_legendary: require('../../../assets/images/cards/apocalypse_flame_dragon.png'),
  light_unique: require('../../../assets/images/cards/radiant_judgment.png'),
  dark_magic: require('../../../assets/images/cards/shadow_rogue.png'),
};

export function getCardImage(imageKey: string): ImageSourcePropType {
  return getCardImageSource(imageKey, 'full');
}

export function getCardThumbnail(imageKey: string): ImageSourcePropType {
  return getCardImageSource(imageKey, 'thumbnail');
}

function getCardImageSource(
  imageKey: string,
  variant: CardImageVariant,
): ImageSourcePropType {
  const normalizedKey = imageKey.trim().replace(/^\/+/, '');
  if (!normalizedKey) return fallbackCardImage;

  const localImage = cardImages[normalizedKey];
  if (localImage) return localImage;

  if (/^https?:\/\//i.test(imageKey)) {
    return { uri: imageKey };
  }

  const storagePath =
    variant === 'thumbnail' ? toThumbnailStoragePath(normalizedKey) : normalizedKey;
  const encodedPath = storagePath
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return {
    uri: `${SUPABASE_PUBLIC_IMAGE_BASE_URL}/${encodedPath}?v=${CARD_IMAGE_CACHE_VERSION}`,
  };
}

/** 광고가 재생되는 동안 예약된 카드 이미지를 디스크 캐시에 준비합니다. */
export async function prefetchCardImage(
  imageKey: string,
  variant: CardImageVariant = 'full',
): Promise<boolean> {
  const source = getCardImageSource(imageKey, variant);
  if (typeof source === 'number' || !('uri' in source) || !source.uri) {
    return true;
  }
  try {
    return await Image.prefetch(source.uri);
  } catch {
    // 이미지 사전 로드 실패가 카드 지급 자체를 막아서는 안 됩니다.
    return false;
  }
}

/** 앱 최초 로딩 중 보유 카드 목록용 썸네일을 중복 없이 준비합니다. */
export async function prefetchCardThumbnails(
  imageKeys: readonly string[],
): Promise<void> {
  const uniqueKeys = [...new Set(imageKeys.filter(Boolean))];
  await Promise.all(
    uniqueKeys.map((imageKey) => prefetchCardImage(imageKey, 'thumbnail')),
  );
}

function toThumbnailStoragePath(imageKey: string): string {
  const relativePath = imageKey.startsWith('cards/')
    ? imageKey.slice('cards/'.length)
    : imageKey;
  const extensionIndex = relativePath.lastIndexOf('.');
  const pathWithoutExtension =
    extensionIndex > relativePath.lastIndexOf('/')
      ? relativePath.slice(0, extensionIndex)
      : relativePath;
  return `cards/thumb/${pathWithoutExtension}.webp`;
}
