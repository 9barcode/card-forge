import { Image } from 'react-native';
import {
  getCardThumbnail,
  prefetchCardImage,
  prefetchCardThumbnails,
} from '../../../src/features/game-cache/gamePresentation';

it('Supabase 카드 경로를 공개 URL로 변환해 디스크 캐시에 미리 받는다', async () => {
  const prefetch = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);

  await expect(prefetchCardImage('cards/webp/flame_knight.webp')).resolves.toBe(
    true,
  );

  expect(prefetch).toHaveBeenCalledWith(
    'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/webp/flame_knight.webp?v=3',
  );
});

it('목록에서도 DB의 카드 URL을 그대로 사용한다', () => {
  expect(getCardThumbnail('cards/webp/flame_knight.webp')).toEqual({
    uri: 'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/webp/flame_knight.webp?v=3',
  });
});

it('보유 카드 썸네일은 같은 경로를 한 번만 미리 받는다', async () => {
  const prefetch = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
  prefetch.mockClear();

  await prefetchCardThumbnails([
    'cards/webp/flame_knight.webp',
    'cards/webp/flame_knight.webp',
    'cards/webp/frost_witch.webp',
  ]);

  expect(prefetch).toHaveBeenCalledTimes(2);
  expect(prefetch).toHaveBeenCalledWith(
    'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/webp/frost_witch.webp?v=3',
  );
});
