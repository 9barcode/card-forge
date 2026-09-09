import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { ExchangePage } from '../../../pages/exchange';
import { gameCache } from '../../../src/features/game-cache';
import { rewardedAdService } from '../../../src/services/rewardedAdService';
import { configureTestRuntime } from './game-runtime.fixture';

jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn() }));
jest.mock('../../../src/services/rewardedAdService', () => ({
  rewardedAdService: { load: jest.fn(), show: jest.fn() },
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await configureTestRuntime();
  jest.mocked(rewardedAdService.load).mockResolvedValue(undefined);
  jest.mocked(rewardedAdService.show).mockResolvedValue({
    unitType: 'card',
    unitAmount: 1,
    completionId: 'proof-1234',
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('선택한 1~5장만 판매하고 결정과 보관함을 캐시에 반영한다', async () => {
  const screen = render(React.createElement(ExchangePage));
  fireEvent.press(screen.getByLabelText('땅 노말 1강'));
  fireEvent.press(screen.getByLabelText('물 레어 3강'));
  fireEvent.press(screen.getByText('선택 카드 판매'));
  await waitFor(() => expect(gameCache.getSnapshot().cards).toHaveLength(1));
  expect(gameCache.getSnapshot().crystalBalance).toBe(1_100_000);
  expect(screen.getByText('0장 선택')).toBeTruthy();
});

it('보유 결정을 포인트로 교환하면 캐시 잔액이 감소한다', async () => {
  const screen = render(React.createElement(ExchangePage));
  fireEvent.press(screen.getByText('결정 → 포인트'));
  fireEvent.changeText(screen.getByLabelText('교환할 결정 수량'), '20000');
  fireEvent.press(screen.getByText('포인트로 교환'));
  await waitFor(() =>
    expect(gameCache.getSnapshot().crystalBalance).toBe(980_000),
  );
  expect(screen.getByText('보유 결정 980,000개')).toBeTruthy();
});
