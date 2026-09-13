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

  const glowRadius = Math.max(borderRadius - 4, 4);
  const auraColor = isMaxLevel ? '#FFD76A' : (color ?? '#FFD76A');
  const glowStyle = {
    backgroundColor: withAlpha(auraColor, isMaxLevel ? 0.22 : 0.16),
    shadowColor: auraColor,
    shadowOpacity: isMaxLevel ? 0.95 : 0.72,
    shadowRadius: isMaxLevel ? 18 : 12,
    elevation: isMaxLevel ? 16 : 10,
  };

  return (
    <View
      pointerEvents="none"
      testID={isMaxLevel ? 'max-level-gold-aura' : 'grade-color-aura'}
      style={styles.aura}
    >
      <View
        style={[
          styles.glow,
          styles.topGlow,
          glowStyle,
          { borderRadius: glowRadius },
        ]}
      />
      <View
        style={[
          styles.glow,
          styles.rightGlow,
          glowStyle,
          { borderRadius: glowRadius },
        ]}
      />
      <View
        style={[
          styles.glow,
          styles.bottomGlow,
          glowStyle,
          { borderRadius: glowRadius },
        ]}
      />
      <View
        style={[
          styles.glow,
          styles.leftGlow,
          glowStyle,
          { borderRadius: glowRadius },
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
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
  },
  topGlow: {
    top: -9,
    right: 8,
    left: 8,
    height: 7,
  },
  rightGlow: {
    top: 8,
    right: -9,
    bottom: 8,
    width: 7,
  },
  bottomGlow: {
    right: 8,
    bottom: -9,
    left: 8,
    height: 7,
  },
  leftGlow: {
    top: 8,
    bottom: 8,
    left: -9,
    width: 7,
  },
});
