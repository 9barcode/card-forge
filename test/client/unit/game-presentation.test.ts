import { Image } from 'react-native';
import { prefetchCardImage } from '../../../src/features/game-cache/gamePresentation';

it('Supabase 카드 경로를 공개 URL로 변환해 디스크 캐시에 미리 받는다', async () => {
  const prefetch = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);

  await expect(prefetchCardImage('cards/fire/flame knight.png')).resolves.toBe(
    true,
  );

  expect(prefetch).toHaveBeenCalledWith(
    'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/images/cards/fire/flame%20knight.png',
  );
});
