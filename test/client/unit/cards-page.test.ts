import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { CardsPage } from '../../../pages/cards';
import { gameCache } from '../../../src/features/game-cache';
import {
  configureTestRuntime,
  findTestCard,
  initialGameSnapshot,
} from './game-runtime.fixture';

const mockNavigate = jest.fn();
jest.mock('@granite-js/react-native', () => ({
  createRoute: jest.fn(),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

beforeEach(async () => {
  mockNavigate.mockClear();
  await configureTestRuntime();
});

it('캐시의 보유 카드를 표시하고 캐시 변경에 즉시 반응한다', () => {
  const screen = render(React.createElement(CardsPage));
  expect(screen.getByText('3장')).toBeTruthy();
  act(() => {
    gameCache.replaceFromServer({
      ...gameCache.getSnapshot(),
      cards: [
        ...gameCache.getSnapshot().cards,
        {
          ...findTestCard('card-earth'),
          cardId: 'card-wind',
          name: '바람의 궁수',
          element: 'WIND',
        },
      ],
      packAvailability: {
        ...initialGameSnapshot.packAvailability,
        ownedCardCount: 4,
      },
    });
  });
  expect(screen.getByText('4장')).toBeTruthy();
  expect(screen.getByText('바람의 궁수')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('땅 노말 1강 카드 상세 보기'));
  expect(mockNavigate).toHaveBeenCalledWith('/card-detail', {
    id: 'card-earth',
  });
});
