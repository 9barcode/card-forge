import React from 'react';
import { Animated } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PacksPage } from '../../../pages/packs';
import { rewardedAdService } from '../../../src/services/rewardedAdService';
import { packService } from '../../../src/services/packService';

jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn() }));
jest.mock('../../../src/services/rewardedAdService', () => ({
  rewardedAdService: { load: jest.fn(), show: jest.fn() },
}));
jest.mock('../../../src/services/packService', () => ({
  packService: { getAvailability: jest.fn(), openPack: jest.fn() },
}));

const load = rewardedAdService.load as jest.Mock;
const show = rewardedAdService.show as jest.Mock;
const getAvailability = packService.getAvailability as jest.Mock;
const openPack = packService.openPack as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Animated, 'sequence').mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  getAvailability.mockResolvedValue({ ownedCardCount: 4, storageCapacity: 5, storageFull: false });
  load.mockResolvedValue(undefined);
  show.mockResolvedValue({ unitType: 'card', unitAmount: 1 });
  openPack.mockResolvedValue([{ id: '1', elementLabel: '바람', rarityLabel: '노말', enhanceLevel: 1, image: 1 }]);
});

afterEach(() => jest.restoreAllMocks());

it('광고 미지원 환경에서는 토스 앱 실행을 안내하고 보상을 지급하지 않는다', async () => {
  load.mockRejectedValueOnce(new Error('REWARDED_AD_NOT_SUPPORTED'));
  const screen = render(React.createElement(PacksPage));
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  await waitFor(() => expect(screen.getByText('현재 환경에서는 광고를 재생할 수 없어요. 토스 앱에서 다시 실행해 주세요.')).toBeTruthy());
  expect(show).not.toHaveBeenCalled();
  expect(openPack).not.toHaveBeenCalled();
  expect(screen.getByText('카드 뽑기')).toBeTruthy();
});

it('진입 시 광고를 로드하지 않고 버튼을 누르면 로드 후 표시한다', async () => {
  let finishLoad = () => {};
  load.mockImplementation(() => new Promise<void>((resolve) => { finishLoad = resolve; }));
  const screen = render(React.createElement(PacksPage));
  expect(screen.getByText('카드 뽑기')).toBeTruthy();
  expect(load).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  expect(load).toHaveBeenCalledTimes(1);
  expect(show).not.toHaveBeenCalled();
  await act(async () => { finishLoad(); });
  await waitFor(() => expect(show).toHaveBeenCalledTimes(1));
});

it('광고 완료 후 이펙트를 실행하고 이펙트 종료 후 당첨 카드를 보여준다', async () => {
  let finishAd: (value: unknown) => void = () => {};
  let finishEffect: (result: { finished: boolean }) => void = () => {};
  show.mockImplementation(() => new Promise((resolve) => { finishAd = resolve; }));
  jest.spyOn(Animated, 'sequence').mockReturnValue({
    start: (callback) => { finishEffect = callback!; }, stop: jest.fn(), reset: jest.fn(),
  });
  const screen = render(React.createElement(PacksPage));
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  await waitFor(() => expect(show).toHaveBeenCalledTimes(1));
  expect(openPack).not.toHaveBeenCalled();
  await act(async () => { finishAd({ unitType: 'card', unitAmount: 1 }); });
  expect(screen.getByText('원소의 힘이 모이고 있어요…')).toBeTruthy();
  expect(screen.queryByText('카드 당첨!')).toBeNull();
  act(() => finishEffect({ finished: true }));
  expect(screen.getByText('카드 당첨!')).toBeTruthy();
  expect(screen.getByText('[1강]')).toBeTruthy();
  fireEvent.press(screen.getByText('확인'));
  expect(screen.getByText('카드 뽑기')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('광고를 중간에 닫으면 뽑지 않고 카드 뽑기 버튼으로 돌아온다', async () => {
  show.mockRejectedValue(new Error('REWARDED_AD_DISMISSED_WITHOUT_REWARD'));
  const screen = render(React.createElement(PacksPage));
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  await waitFor(() => expect(screen.getByText('광고를 끝까지 시청해야 카드를 뽑을 수 있어요.')).toBeTruthy());
  expect(openPack).not.toHaveBeenCalled();
  expect(screen.getByText('카드 뽑기')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('광고 로드 실패 후에도 카드 뽑기로 재시도할 수 있다', async () => {
  load.mockRejectedValueOnce(new Error('NETWORK_ERROR'));
  const screen = render(React.createElement(PacksPage));
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  await waitFor(() => expect(screen.getByText('카드 뽑기를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.')).toBeTruthy());
  expect(show).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('카드 뽑기'));
  await waitFor(() => expect(show).toHaveBeenCalledTimes(1));
});


it('DB 응답의 보유 카드가 5장이면 광고와 카드 뽑기를 모두 막는다', async () => {
  getAvailability.mockResolvedValue({
    ownedCardCount: 5,
    storageCapacity: 5,
    storageFull: true,
  });
  const screen = render(React.createElement(PacksPage));
  await waitFor(() => expect(screen.getByText('보관함이 가득 찼어요 (5/5)')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  expect(load).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();
  expect(openPack).not.toHaveBeenCalled();
});
