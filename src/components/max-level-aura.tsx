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

/** 10강은 금색, 그 외 카드는 등급색의 부드러운 확산광을 표시합니다. */
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
          styles.glow,
          {
            borderRadius,
            backgroundColor: withAlpha(auraColor, 0.012),
            shadowColor: auraColor,
            shadowOpacity: isMaxLevel ? 1 : 0.78,
            shadowRadius: isMaxLevel ? 34 : 22,
            elevation: isMaxLevel ? 18 : 11,
            transform: [{ scale: isMaxLevel ? 1.025 : 1.015 }],
          },
        ]}
      />
      <View
        testID={
          isMaxLevel ? 'max-level-gold-core-glow' : 'grade-color-core-glow'
        }
        style={[
          styles.glow,
          {
            borderRadius,
            backgroundColor: withAlpha(auraColor, 0.01),
            shadowColor: auraColor,
            shadowOpacity: isMaxLevel ? 0.92 : 0.62,
            shadowRadius: isMaxLevel ? 18 : 12,
            elevation: isMaxLevel ? 14 : 8,
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
  glow: {
    ...StyleSheet.absoluteFillObject,
    shadowOffset: { width: 0, height: 0 },
  },
});
