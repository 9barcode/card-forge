import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ExchangePage } from '../../../pages/exchange';

jest.mock('@granite-js/react-native', () => ({ createRoute: jest.fn() }));
afterEach(() => jest.restoreAllMocks());

it('선택한 카드 가치의 합계를 JSON 기준으로 보여준다', () => {
  const screen = render(React.createElement(ExchangePage));
  fireEvent.press(screen.getByLabelText('땅 노말 1강'));
  fireEvent.press(screen.getByLabelText('물 레어 3강'));
  expect(screen.getByText('2장 선택')).toBeTruthy();
  const alert = jest.spyOn(Alert, 'alert');
  fireEvent.press(screen.getByText('결정으로 교환'));
  expect(alert).toHaveBeenCalledWith('교환 미리보기', expect.stringContaining('100,000결정'));
  fireEvent.press(screen.getByLabelText('땅 노말 1강'));
  expect(screen.getByText('1장 선택')).toBeTruthy();
});

it('결정 수량을 입력하면 포인트와 소모하지 않을 잔여 수량을 보여준다', () => {
  const screen = render(React.createElement(ExchangePage));
  fireEvent.press(screen.getByText('결정 → 포인트'));
  fireEvent.changeText(screen.getByLabelText('교환할 결정 수량'), '25000');
  expect(screen.getByText('사용 결정 20,000개')).toBeTruthy();
  expect(screen.getByText('입력 수량 중 교환하지 않는 결정 5,000개')).toBeTruthy();
  const alert = jest.spyOn(Alert, 'alert');
  fireEvent.press(screen.getByText('포인트로 교환'));
  expect(alert).toHaveBeenCalledWith('교환 미리보기', expect.stringContaining('2포인트'));
  fireEvent.changeText(screen.getByLabelText('교환할 결정 수량'), '-10');
  expect(screen.getByText('0 이상의 정수로 입력해 주세요.')).toBeTruthy();
});
