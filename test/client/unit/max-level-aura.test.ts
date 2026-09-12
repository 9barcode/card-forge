import { render } from '@testing-library/react-native';
import React from 'react';
import { MaxLevelAura } from '../../../src/components/max-level-aura';

it('10강 카드에만 금색 오로라를 표시한다', () => {
  const screen = render(React.createElement(MaxLevelAura, { level: 9 }));
  expect(screen.queryByTestId('max-level-gold-aura')).toBeNull();

  screen.rerender(React.createElement(MaxLevelAura, { level: 10 }));
  expect(screen.getByTestId('max-level-gold-aura')).toBeTruthy();
});
