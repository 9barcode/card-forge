import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MaxLevelAuraProps {
  level: number;
  borderRadius?: number;
  color?: string;
}

function withAlpha(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return hexColor;
  const value = Number.parseInt(hex, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/** 10강은 금색, 그 외 카드는 등급색 오로라를 카드 바깥에 표시합니다. */
export function MaxLevelAura({
  level,
  borderRadius = 18,
  color,
}: MaxLevelAuraProps) {
  const isMaxLevel = level >= 10;
  if (!isMaxLevel && !color) return null;
  const auraColor = isMaxLevel ? '#FFD76A' : (color ?? '#FFD76A');

  return (
    <View
      pointerEvents="none"
      testID={isMaxLevel ? 'max-level-gold-aura' : 'grade-color-aura'}
      style={styles.aura}
    >
      <View
        testID={
          isMaxLevel ? 'max-level-gold-wide-glow' : 'grade-color-wide-glow'
        }
        style={[
          styles.wideGlow,
          {
            borderRadius,
            backgroundColor: withAlpha(auraColor, isMaxLevel ? 0.14 : 0.08),
            shadowColor: auraColor,
            shadowOpacity: isMaxLevel ? 1 : 0.82,
            shadowRadius: isMaxLevel ? 28 : 20,
            elevation: isMaxLevel ? 18 : 14,
          },
        ]}
      />
      <View
        testID={
          isMaxLevel ? 'max-level-gold-core-glow' : 'grade-color-core-glow'
        }
        style={[
          styles.coreGlow,
          {
            borderRadius,
            backgroundColor: withAlpha(auraColor, isMaxLevel ? 0.2 : 0.1),
            shadowColor: auraColor,
            shadowOpacity: isMaxLevel ? 0.9 : 0.68,
            shadowRadius: isMaxLevel ? 12 : 10,
            elevation: isMaxLevel ? 12 : 8,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  aura: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  wideGlow: {
    ...StyleSheet.absoluteFillObject,
    shadowOffset: { width: 0, height: 0 },
  },
  coreGlow: {
    ...StyleSheet.absoluteFillObject,
    shadowOffset: { width: 0, height: 0 },
  },
});
