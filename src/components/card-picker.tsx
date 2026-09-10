import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CachedOwnedCard } from '../features/game-cache/gameCache';
import { elementLabels, gradeLabels } from '../features/game-cache/gamePresentation';
import { Card } from './card';

interface CardPickerProps {
  cards: readonly CachedOwnedCard[];
  selectedId: string | null;
  onSelect: (cardId: string) => void;
  disabled?: boolean;
}

export function CardPicker({ cards, selectedId, onSelect, disabled = false }: CardPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>보유 카드 {Math.min(cards.length, 5)}/5</Text>
      <View style={styles.slots}>
        {Array.from({ length: 5 }, (_, index) => {
          const card = cards[index];
          if (!card) {
            return (
              <View key={`empty-${index}`} style={[styles.slot, styles.empty]}>
                <Text style={styles.plus}>＋</Text>
                <Text style={styles.emptyText}>빈 슬롯</Text>
              </View>
            );
          }
          const selected = card.cardId === selectedId;
          return (
            <TouchableOpacity
              key={card.cardId}
              accessibilityRole="radio"
              accessibilityLabel={`${elementLabels[card.element]} ${gradeLabels[card.grade]} 선택`}
              accessibilityState={{ selected, checked: selected, disabled }}
              disabled={disabled}
              activeOpacity={0.8}
              onPress={() => onSelect(card.cardId)}
              style={[styles.slot, selected && styles.selected, disabled && styles.disabled]}
            >
              <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Card card={card} style={styles.card} />
              </View>
              <Text style={styles.name} numberOfLines={1}>{card.name}</Text>
              <Text style={selected ? styles.selectedText : styles.selectText}>
                {selected ? '✓ 선택됨' : '선택'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 420, gap: 12 },
  title: { color: '#E4D9C4', fontSize: 14, fontWeight: '700' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  slot: { width: '30%', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: '#3A4655', backgroundColor: '#192432' },
  card: { width: '100%' },
  selected: { borderColor: '#EAC681', backgroundColor: '#34332E' },
  disabled: { opacity: 0.5 },
  name: { color: '#E3DFD6', fontSize: 11, textAlign: 'center', marginTop: 7 },
  selectText: { color: '#AAB6C5', textAlign: 'center', fontSize: 11, marginVertical: 5 },
  selectedText: { color: '#EAC681', textAlign: 'center', fontSize: 11, fontWeight: '700', marginVertical: 5 },
  empty: { minHeight: 180, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  plus: { color: '#66758A', fontSize: 28 },
  emptyText: { color: '#AAB6C5', fontSize: 11 },
});
