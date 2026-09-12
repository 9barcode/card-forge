import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MaxLevelAuraProps {
  level: number;
  borderRadius?: number;
}

/** 10강 카드의 테두리는 유지하고 카드 바깥에만 금색 오로라를 표시합니다. */
export function MaxLevelAura({
  level,
  borderRadius = 18,
}: MaxLevelAuraProps) {
  if (level < 10) return null;

  const glowRadius = Math.max(borderRadius - 4, 4);

  return (
    <View
      pointerEvents="none"
      testID="max-level-gold-aura"
      style={styles.aura}
    >
      <View style={[styles.glow, styles.topGlow, { borderRadius: glowRadius }]} />
      <View
        style={[styles.glow, styles.rightGlow, { borderRadius: glowRadius }]}
      />
      <View
        style={[styles.glow, styles.bottomGlow, { borderRadius: glowRadius }]}
      />
      <View
        style={[styles.glow, styles.leftGlow, { borderRadius: glowRadius }]}
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
    backgroundColor: 'rgba(255, 215, 106, 0.22)',
    shadowColor: '#FFD76A',
    shadowOpacity: 0.95,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
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
