import { Image } from 'react-native';
import {
  getCardThumbnail,
  prefetchCardImage,
  prefetchCardThumbnails,
} from '../../../src/features/game-cache/gamePresentation';

it('Supabase 카드 경로를 공개 URL로 변환해 디스크 캐시에 미리 받는다', async () => {
  const prefetch = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);

  await expect(prefetchCardImage('cards/fire/flame knight.png')).resolves.toBe(
    true,
  );

  expect(prefetch).toHaveBeenCalledWith(
    'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/fire/flame%20knight.png?v=2',
  );
});

it('카드 경로를 목록용 WebP 썸네일 URL로 변환한다', () => {
  expect(getCardThumbnail('cards/fire/flame knight.png')).toEqual({
    uri: 'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/thumb/fire/flame%20knight.webp?v=2',
  });
});

it('보유 카드 썸네일은 같은 경로를 한 번만 미리 받는다', async () => {
  const prefetch = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
  prefetch.mockClear();

  await prefetchCardThumbnails([
    'cards/fire/flame knight.png',
    'cards/fire/flame knight.png',
    'cards/water/frost witch.png',
  ]);

  expect(prefetch).toHaveBeenCalledTimes(2);
  expect(prefetch).toHaveBeenCalledWith(
    'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/thumb/water/frost%20witch.webp?v=2',
  );
});
