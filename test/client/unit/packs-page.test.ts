import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';
import { PacksPage } from '../../../pages/packs';
import { gameCache } from '../../../src/features/game-cache';
import { rewardedAdService } from '../../../src/services/rewardedAdService';
import { configureTestRuntime } from './game-runtime.fixture';

jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn() }));
jest.mock('../../../src/services/rewardedAdService', () => ({
  rewardedAdService: { load: jest.fn(), show: jest.fn() },
}));
const load = jest.mocked(rewardedAdService.load);
const show = jest.mocked(rewardedAdService.show);
let finishEffect: (result: { finished: boolean }) => void;

beforeEach(async () => {
  jest.clearAllMocks();
  await configureTestRuntime();
  load.mockResolvedValue(undefined);
  show.mockResolvedValue({
    unitType: 'card',
    unitAmount: 1,
    completionId: 'proof-1234',
  });
  jest.spyOn(Animated, 'sequence').mockReturnValue({
    start: (callback) => {
      if (callback) finishEffect = callback;
    },
    stop: jest.fn(),
    reset: jest.fn(),
  });
});
afterEach(() => jest.restoreAllMocks());

it('광고 완료 후 카드팩 결과를 캐시에 추가하고 화면에 표시한다', async () => {
  const screen = render(React.createElement(PacksPage));
  expect(
    screen.getByText('광고 시청 완료 후 카드 1장을 뽑아요 (3/5)'),
  ).toBeTruthy();
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  await waitFor(() =>
    expect(screen.getByText('원소의 힘이 모이고 있어요…')).toBeTruthy(),
  );
  expect(gameCache.getSnapshot().cards).toHaveLength(4);
  act(() => finishEffect({ finished: true }));
  expect(screen.getByText('카드 당첨!')).toBeTruthy();
  expect(screen.getByText('바람 · 노말')).toBeTruthy();
});

it('광고 중단 시 캐시를 변경하지 않는다', async () => {
  show.mockRejectedValueOnce(new Error('REWARDED_AD_DISMISSED_WITHOUT_REWARD'));
  const screen = render(React.createElement(PacksPage));
  fireEvent.press(screen.getByLabelText('카드 뽑기'));
  await waitFor(() =>
    expect(
      screen.getByText('광고를 끝까지 시청해야 카드를 뽑을 수 있어요.'),
    ).toBeTruthy(),
  );
  expect(gameCache.getSnapshot().cards).toHaveLength(3);
});
