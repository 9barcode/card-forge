import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CardsPage } from '../../../pages/cards';

const mockNavigate = jest.fn();
jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn(), useNavigation: () => ({ navigate: mockNavigate }) }));

beforeEach(() => mockNavigate.mockClear());

it('임시 카드와 보관함 요약을 표시하고 상세 화면으로 이동한다', async () => {
  const screen = render(React.createElement(CardsPage));
  await waitFor(() => expect(screen.getByText('6장')).toBeTruthy());
  expect(screen.getAllByText('10강').length).toBeGreaterThan(0);
  expect(screen.getByText('6종')).toBeTruthy();
  expect(screen.getByText('대지의 수호자')).toBeTruthy();
  expect(screen.getByText('심연의 군주')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('땅 노말 1강 카드 상세 보기'));
  expect(mockNavigate).toHaveBeenCalledWith('/card-detail', { id: '1' });
});
