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

  if (isMaxLevel) {
    return (
      <View
        pointerEvents="none"
        testID="max-level-gold-aura"
        style={styles.aura}
      >
        <View
          testID="max-level-gold-wide-glow"
          style={[styles.maxLevelWideGlow, { borderRadius }]}
        />
        <View
          testID="max-level-gold-core-glow"
          style={[styles.maxLevelCoreGlow, { borderRadius }]}
        />
      </View>
    );
  }

  const glowRadius = Math.max(borderRadius - 4, 4);
  const auraColor = color ?? '#FFD76A';
  const glowStyle = {
    backgroundColor: withAlpha(auraColor, 0.16),
    shadowColor: auraColor,
    shadowOpacity: 0.72,
    shadowRadius: 12,
    elevation: 10,
  };

  return (
    <View pointerEvents="none" testID="grade-color-aura" style={styles.aura}>
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
  maxLevelWideGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 215, 106, 0.14)',
    shadowColor: '#FFD76A',
    shadowOpacity: 1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  maxLevelCoreGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 215, 106, 0.2)',
    shadowColor: '#FFE7A6',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
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
