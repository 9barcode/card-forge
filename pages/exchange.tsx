import { styles } from '../assets/sytle/exchange.style';
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { cardValues, getCardCrystalValue, getPointQuote, type CardGrade } from '../src/services/cardValues';

export const Route = createRoute('/exchange', {
  validateParams: (params) => params,
  component: ExchangePage,
});

// UI 확인용 카드입니다. 실제 보유 카드와 잔액은 서버 연동 시 대체합니다.
const previewCards: { id: string; element: string; grade: CardGrade; level: number; image: number }[] = [
  { id: 'earth', element: '땅', grade: 'NORMAL', level: 1, image: require('../assets/images/cards/earth_normal.png') },
  { id: 'water', element: '물', grade: 'RARE', level: 3, image: require('../assets/images/cards/water_rare.png') },
  { id: 'fire', element: '불', grade: 'LEGENDARY', level: 10, image: require('../assets/images/cards/fire_legendary.png') },
];
const format = (value: number) => value.toLocaleString('ko-KR');

export function ExchangePage() {
  const [tab, setTab] = useState<'cards' | 'points'>('cards');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('10000');
  const selectedCards = previewCards.filter((card) => selectedIds.includes(card.id));
  const total = selectedCards.reduce((sum, card) => sum + getCardCrystalValue(card.grade, card.level), 0);
  const entered = /^\d+$/.test(amount) ? Number(amount) : NaN;
  const validAmount = Number.isSafeInteger(entered) && entered >= 0;
  const quote = validAmount ? getPointQuote(entered) : { points: 0, cost: 0, remainder: 0 };

  const toggle = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const preview = () => Alert.alert('교환 미리보기', tab === 'cards'
    ? `선택한 카드 ${selectedCards.length}장의 기본 가치는 ${format(total)}결정입니다. 실제 카드 소모와 결정 지급은 서버 연결 후 사용할 수 있어요.`
    : `${format(quote.cost)}결정으로 ${format(quote.points)}포인트를 교환할 수 있어요. 실제 포인트 지급은 서버 연결 후 사용할 수 있어요.`);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>CARD FORGE · EXCHANGE</Text>
      <Text style={styles.title}>포인트 교환소</Text>
      <Text style={styles.subtitle}>카드의 가치를 결정으로, 결정을 포인트로</Text>
      <View style={styles.notice}><Text style={styles.noticeText}>교환 미리보기 · 예시 카드로 교환 금액을 확인해 보세요</Text></View>

      <View style={styles.tabs}>
        {([{ key: 'cards', label: '카드 → 결정' }, { key: 'points', label: '결정 → 포인트' }] as const).map((item) => (
          <TouchableOpacity key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.activeTab]}>
            <Text style={[styles.tabText, tab === item.key && styles.activeTabText]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'cards' ? (
        <>
          <View style={styles.sectionHeading}><Text style={styles.heading}>교환할 카드 선택</Text><Text style={styles.muted}>{selectedIds.length}장 선택</Text></View>
          <Text style={styles.muted}>등급과 강화 단계에 따라 결정 가치가 달라져요.</Text>
          {previewCards.map((card) => {
            const selected = selectedIds.includes(card.id);
            return (
              <TouchableOpacity key={card.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${card.element} ${cardValues.grades[card.grade].label} ${card.level}강`} onPress={() => toggle(card.id)} style={[styles.cardRow, selected && styles.selectedCard]}>
                <View><Image source={card.image} style={styles.cardImage} /><Text style={styles.level}>{card.level}강</Text></View>
                <View style={styles.cardInfo}><Text style={styles.cardName}>{card.element} · {cardValues.grades[card.grade].label}</Text><Text style={styles.muted}>{card.level}강</Text><Text style={styles.cardValue}>{format(getCardCrystalValue(card.grade, card.level))} 결정</Text></View>
                <View style={[styles.checkbox, selected && styles.checked]}><Text style={styles.checkText}>{selected ? '✓' : ''}</Text></View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.summary}><Text style={styles.muted}>받을 결정</Text><Text style={styles.total}>{format(total)} <Text style={styles.unit}>결정</Text></Text><Text style={styles.summaryNote}>선택한 카드 {selectedCards.length}장 · 기본 가치 기준</Text></View>
          <TouchableOpacity accessibilityRole="button" disabled={!selectedIds.length} onPress={preview} style={[styles.button, !selectedIds.length && styles.disabled]}><Text style={styles.buttonText}>결정으로 교환</Text></TouchableOpacity>

          <View style={styles.valueTable}>
            <Text style={styles.heading}>카드 기본 가치</Text>
            <Text style={styles.tableNote}>1강 가치 × 강화 단계</Text>
            <View style={styles.tableRow}><Text style={styles.tableGrade}>등급</Text><Text style={styles.tableNumber}>1강</Text><Text style={styles.tableNumber}>10강</Text></View>
            {(Object.keys(cardValues.grades) as CardGrade[]).map((grade) => (
              <View key={grade} style={styles.tableRow}><Text style={styles.tableGrade}>{cardValues.grades[grade].label}</Text><Text style={styles.tableNumber}>{format(getCardCrystalValue(grade, 1))}</Text><Text style={styles.tableNumber}>{format(getCardCrystalValue(grade, 10))}</Text></View>
            ))}
            <Text style={styles.tableNote}>단위: 결정</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.rateCard}><Text style={styles.muted}>결정 교환 비율</Text><Text style={styles.rate}>{format(cardValues.crystalsPerPoint)}결정 = 1포인트</Text></View>
          <Text style={styles.heading}>교환할 결정</Text>
          <View style={styles.inputRow}><TextInput accessibilityLabel="교환할 결정 수량" keyboardType="number-pad" value={amount} onChangeText={setAmount} placeholder="결정 수량 입력" placeholderTextColor="#64748B" style={styles.input} maxLength={15} /><Text style={styles.unit}>결정</Text></View>
          <View style={styles.presets}>{[1, 10, 100].map((points) => <TouchableOpacity key={points} accessibilityRole="button" onPress={() => setAmount(String(points * cardValues.crystalsPerPoint))} style={styles.preset}><Text style={styles.presetText}>{format(points * cardValues.crystalsPerPoint)}</Text></TouchableOpacity>)}</View>
          {!validAmount && <Text style={styles.error}>0 이상의 정수로 입력해 주세요.</Text>}
          <View style={styles.summary} accessibilityLiveRegion="polite"><Text style={styles.muted}>받을 포인트</Text><Text style={styles.total}>{format(quote.points)} <Text style={styles.unit}>P</Text></Text><Text style={styles.summaryNote}>사용 결정 {format(quote.cost)}개</Text><Text style={styles.summaryNote}>입력 수량 중 교환하지 않는 결정 {format(quote.remainder)}개</Text></View>
          <Text style={styles.muted}>포인트는 정수 단위로 교환하며, 남은 결정은 소모하지 않아요.</Text>
          <TouchableOpacity accessibilityRole="button" disabled={!validAmount || quote.points < 1} onPress={preview} style={[styles.button, (!validAmount || quote.points < 1) && styles.disabled]}><Text style={styles.buttonText}>포인트로 교환</Text></TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
