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
export const CARD_IMAGE_CACHE_VERSION = '3';

export type CardImageVariant = 'full' | 'thumbnail';

const fallbackCardImage: ImageSourcePropType = {
  uri: `${SUPABASE_PUBLIC_IMAGE_BASE_URL}/cards/webp/earth_guardian.webp?v=${CARD_IMAGE_CACHE_VERSION}`,
};

export function getCardImage(imageKey: string): ImageSourcePropType {
  return getCardImageSource(imageKey, 'full');
}

export function getCardThumbnail(imageKey: string): ImageSourcePropType {
  return getCardImageSource(imageKey, 'thumbnail');
}

function getCardImageSource(
  imageKey: string,
  _variant: CardImageVariant,
): ImageSourcePropType {
  const normalizedKey = imageKey.trim().replace(/^\/+/, '');
  if (!normalizedKey) return fallbackCardImage;

  if (/^https?:\/\//i.test(imageKey)) {
    return { uri: imageKey };
  }

  const encodedPath = normalizedKey
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
