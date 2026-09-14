import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';
import { ForgePage } from '../../../pages/forge';
import { gameCache } from '../../../src/features/game-cache';
import { rewardedAdService } from '../../../src/services/rewardedAdService';
import { configureTestRuntime, findTestCard } from './game-runtime.fixture';

jest.mock('@granite-js/react-native', () => ({
  createRoute: jest.fn(() => ({})),
}));
jest.mock('../../../src/services/rewardedAdService', () => ({
  rewardedAdService: { load: jest.fn(), show: jest.fn() },
  isRewardedAdSuccess: jest.fn(() => true),
}));
const load = jest.mocked(rewardedAdService.load);
const show = jest.mocked(rewardedAdService.show);

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  await configureTestRuntime();
  load.mockResolvedValue(undefined);
  show.mockResolvedValue({
    unitType: 'card',
    unitAmount: 1,
    completionId: 'proof-1234',
  });
  jest.spyOn(Animated, 'sequence').mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('원하는 카드 한 장을 강화하고 캐시의 해당 카드만 갱신한다', async () => {
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('땅 노말 1강 카드 선택'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  await waitFor(() =>
    expect(screen.getByText('여기는 배너광고 위젯입니다')).toBeTruthy(),
  );
  expect(screen.queryByText('강화 성공!')).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(4_999);
    await Promise.resolve();
  });
  expect(screen.queryByText('강화 성공!')).toBeNull();

  await act(async () => {
    jest.advanceTimersByTime(1);
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('강화 성공!')).toBeTruthy());
  expect(
    gameCache.getSnapshot().cards.find((card) => card.cardId === 'card-earth')
      ?.enhancementLevel,
  ).toBe(2);
  expect(
    gameCache.getSnapshot().cards.find((card) => card.cardId === 'card-water')
      ?.enhancementLevel,
  ).toBe(3);
});

it('강화 실패를 잠금 상태로 캐시에 반영한다', async () => {
  await configureTestRuntime({
    enhanceCard: async ({ cardId }) => ({
      result: 'FAILURE',
      card: {
        ...findTestCard(cardId),
        status: 'ENHANCEMENT_LOCKED',
      },
    }),
  });
  const screen = render(React.createElement(ForgePage));
  fireEvent.press(screen.getByLabelText('물 레어 3강 카드 선택'));
  fireEvent.press(screen.getByLabelText('강화 시도'));
  await waitFor(() =>
    expect(screen.getByText('여기는 배너광고 위젯입니다')).toBeTruthy(),
  );
  await act(async () => {
    jest.advanceTimersByTime(5_000);
    await Promise.resolve();
  });
  await waitFor(() => expect(screen.getByText('강화 실패')).toBeTruthy());
  expect(
    gameCache.getSnapshot().cards.find((card) => card.cardId === 'card-water')
      ?.status,
  ).toBe('ENHANCEMENT_LOCKED');
});
