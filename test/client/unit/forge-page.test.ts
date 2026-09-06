import React from 'react';
import { Animated } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ForgePage } from '../../../pages/forge';
import { rewardedAdService } from '../../../src/services/rewardedAdService';
import { enhancementService } from '../../../src/services/enhancementService';

jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn() }));
jest.mock('../../../src/services/rewardedAdService', () => ({ rewardedAdService: { load: jest.fn(), show: jest.fn() } }));
const load = jest.mocked(rewardedAdService.load);
const show = jest.mocked(rewardedAdService.show);
let finishEffect: (result: { finished: boolean }) => void;
beforeEach(() => {
  jest.clearAllMocks();
  load.mockResolvedValue(undefined);
  show.mockResolvedValue({ unitType: 'card', unitAmount: 1 });
  jest.spyOn(Animated, 'sequence').mockReturnValue({ start: (callback) => { finishEffect = callback!; }, stop: jest.fn(), reset: jest.fn() });
});
afterEach(() => jest.restoreAllMocks());

it('카드 선택 후 버튼을 눌러야 광고를 로드하며 시청 완료 전에 강화하지 않는다', async () => {
  let finishAd: (value: { unitType: string; unitAmount: number }) => void = () => {};
  show.mockImplementation(() => new Promise((resolve) => { finishAd = resolve; }));
  const enhance = jest.spyOn(enhancementService, 'enhanceCard');
  const screen = render(React.createElement(ForgePage));
  expect(load).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('강화 시도'));
  expect(load).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('땅 · 노말 선택'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  await waitFor(() => expect(show).toHaveBeenCalledTimes(1));
  expect(load).toHaveBeenCalledTimes(1);
  expect(enhance).not.toHaveBeenCalled();
  await act(async () => { finishAd({ unitType: 'card', unitAmount: 1 }); });
  expect(screen.getByText('원소의 힘을 불어넣고 있어요…')).toBeTruthy();
  expect(screen.queryByText('강화 성공!')).toBeNull();
  act(() => finishEffect({ finished: true }));
  expect(screen.getByText('강화 성공!')).toBeTruthy();
  expect(screen.getByText('[2강]')).toBeTruthy();
});

it('광고 중단 시 강화나 이펙트를 실행하지 않는다', async () => {
  show.mockRejectedValueOnce(new Error('REWARDED_AD_DISMISSED_WITHOUT_REWARD'));
  const enhance = jest.spyOn(enhancementService, 'enhanceCard');
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('물 · 레어 선택'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  await waitFor(() => expect(screen.getByText('광고를 끝까지 시청해야 강화를 시도할 수 있어요.')).toBeTruthy());
  expect(enhance).not.toHaveBeenCalled();
  expect(screen.getByText('[5강]')).toBeTruthy();
});

it('실패 결과를 보여주고 같은 카드로 재시도할 수 있다', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0.99);
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('물 · 레어 선택'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  await waitFor(() => expect(screen.getByText('원소의 힘을 불어넣고 있어요…')).toBeTruthy());
  act(() => finishEffect({ finished: true }));
  expect(screen.getByText('강화 실패')).toBeTruthy();
  expect(screen.getByText('[5강]')).toBeTruthy();
  fireEvent.press(screen.getByText('확인'));
  expect(screen.getByText('강화 시도')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('10강에 도달한 카드는 추가 광고나 강화를 시작하지 않는다', async () => {
  jest.spyOn(Math, 'random').mockReturnValue(0);
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('불 · 레전더리 선택'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  await waitFor(() => expect(screen.getByText('원소의 힘을 불어넣고 있어요…')).toBeTruthy());
  act(() => finishEffect({ finished: true }));
  expect(screen.getByText('[10강]')).toBeTruthy();
  fireEvent.press(screen.getByText('확인'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  expect(screen.getByText('최대 강화 완료')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});
