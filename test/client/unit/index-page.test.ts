import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HomePage } from '../../../pages';

const mockNavigate = jest.fn();
jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn(), useNavigation: () => ({ navigate: mockNavigate }) }));

beforeEach(() => mockNavigate.mockClear());

it('빠른 이동 라벨 없이 주요 메뉴와 사용자 정보를 표시한다', () => {
  const screen = render(React.createElement(HomePage));
  expect(screen.queryByText('빠른 이동')).toBeNull();
  expect(screen.getByText('카드 보관함')).toBeTruthy();
  expect(screen.getByText('카드 강화소')).toBeTruthy();
  expect(screen.getByText('카드 상점')).toBeTruthy();
  expect(screen.getByText('포인트 교환소')).toBeTruthy();
  expect(screen.queryByText('검은 재')).toBeNull();
  fireEvent.press(screen.getByLabelText('카드 상점 이동'));
  expect(mockNavigate).toHaveBeenCalledWith('/packs');
});
