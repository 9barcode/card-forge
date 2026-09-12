import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MaxLevelAuraProps {
  level: number;
  borderRadius?: number;
}

/** 10강 카드의 기존 등급 테두리 바깥에 금색 오로라를 표시합니다. */
export function MaxLevelAura({
  level,
  borderRadius = 18,
}: MaxLevelAuraProps) {
  if (level < 10) return null;

  return (
    <View
      pointerEvents="none"
      testID="max-level-gold-aura"
      style={[styles.aura, { borderRadius }]}
    >
      <View style={[styles.innerRing, { borderRadius: borderRadius - 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  aura: {
    position: 'absolute',
    top: -7,
    right: -7,
    bottom: -7,
    left: -7,
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 106, 0.72)',
    shadowColor: '#FFD76A',
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  innerRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 244, 184, 0.9)',
  },
});
