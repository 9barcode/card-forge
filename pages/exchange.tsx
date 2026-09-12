import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../assets/sytle/exchange.style';
import {
  elementLabels,
  gameRuntime,
  getCardImage,
  gradeLabels,
  useGameCache,
} from '../src/features/game-cache';
import {
  type CardGrade,
  cardValues,
  getCardCrystalValue,
  getPointQuote,
} from '../src/services/cardValues';
import {
  isRewardedAdSuccess,
  rewardedAdService,
} from '../src/services/rewardedAdService';

export const Route = createRoute('/exchange', {
  validateParams: (params) => params,
  component: ExchangePage,
});

const format = (value: number) => value.toLocaleString('ko-KR');

export function ExchangePage() {
  const game = useGameCache();
  const [tab, setTab] = useState<'cards' | 'points'>('cards');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('10000');
  const selectedCards = game.cards.filter((card) =>
    selectedIds.includes(card.cardId),
  );
  const total = selectedCards.reduce(
    (sum, card) => sum + getCardCrystalValue(card.grade, card.enhancementLevel),
    0,
  );
  const entered = /^\d+$/.test(amount) ? Number(amount) : Number.NaN;
  const validAmount = Number.isSafeInteger(entered) && entered >= 0;
  const quote = validAmount
    ? getPointQuote(entered)
    : { points: 0, cost: 0, remainder: 0 };

  const toggle = (id: string) =>
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  const exchange = async () => {
    try {
      if (tab === 'cards') {
        await rewardedAdService.load();
        const ad = await rewardedAdService.show();
        const rewardSuccess = isRewardedAdSuccess(ad);
        if (!rewardSuccess) {
          throw new Error('REWARDED_AD_REWARD_FAILED');
        }

        const result = await gameRuntime.actions.sellCards({
          accessToken: gameRuntime.requireAccessToken(),
          requestId: gameRuntime.nextRequestId(),
          cardIds: selectedIds,
        });
        setSelectedIds([]);
        Alert.alert(
          '판매 완료',
          `${selectedCards.length}장을 판매해 ${format(result.crystalReward)}결정을 받았어요.`,
        );
      } else {
        const result = await gameRuntime.actions.exchangePoints({
          accessToken: gameRuntime.requireAccessToken(),
          requestId: gameRuntime.nextRequestId(),
          pointAmount: quote.points,
        });
        Alert.alert(
          '교환 완료',
          `${format(result.crystalAmount)}결정을 ${format(result.pointAmount)}포인트로 교환했어요.`,
        );
      }
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : '';
      Alert.alert(
        '처리 실패',
        errorCode === 'INSUFFICIENT_CRYSTALS'
          ? '보유 결정이 부족해요.'
          : errorCode === 'REWARDED_AD_DISMISSED_WITHOUT_REWARD' ||
              errorCode === 'REWARDED_AD_REWARD_FAILED'
            ? '광고를 끝까지 시청해야 카드를 판매할 수 있어요.'
            : '요청을 완료하지 못했어요.',
      );
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>CARD FORGE · EXCHANGE</Text>
      <Text style={styles.title}>포인트 교환소</Text>
      <Text style={styles.subtitle}>
        카드의 가치를 결정으로, 결정을 포인트로
      </Text>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          화면은 캐시를 표시하고 거래 결과는 서버가 확정해요
        </Text>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { key: 'cards', label: '카드 → 결정' },
            { key: 'points', label: '결정 → 포인트' },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.key }}
            onPress={() => setTab(item.key)}
            style={[styles.tab, tab === item.key && styles.activeTab]}
          >
            <Text
              style={[styles.tabText, tab === item.key && styles.activeTabText]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'cards' ? (
        <>
          <View style={styles.sectionHeading}>
            <Text style={styles.heading}>교환할 카드 선택</Text>
            <Text style={styles.muted}>{selectedIds.length}장 선택</Text>
          </View>
          <Text style={styles.muted}>
            등급과 강화 단계에 따라 결정 가치가 달라져요.
          </Text>
          {game.cards.map((card) => {
            const selected = selectedIds.includes(card.cardId);
            return (
              <TouchableOpacity
                key={card.cardId}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${elementLabels[card.element]} ${gradeLabels[card.grade]} ${card.enhancementLevel}강`}
                onPress={() => toggle(card.cardId)}
                style={[styles.cardRow, selected && styles.selectedCard]}
              >
                <View>
                  <Image
                    source={getCardImage(card.imageKey)}
                    style={styles.cardImage}
                  />
                  <Text style={styles.level}>{card.enhancementLevel}강</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>
                    {elementLabels[card.element]} · {gradeLabels[card.grade]}
                  </Text>
                  <Text style={styles.muted}>{card.enhancementLevel}강</Text>
                  <Text style={styles.cardValue}>
                    {format(
                      getCardCrystalValue(card.grade, card.enhancementLevel),
                    )}{' '}
                    결정
                  </Text>
                </View>
                <View style={[styles.checkbox, selected && styles.checked]}>
                  <Text style={styles.checkText}>{selected ? '✓' : ''}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.summary}>
            <Text style={styles.muted}>받을 결정</Text>
            <Text style={styles.total}>
              {format(total)} <Text style={styles.unit}>결정</Text>
            </Text>
            <Text style={styles.summaryNote}>
              선택한 카드 {selectedCards.length}장 · 기본 가치 기준
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!selectedIds.length}
            onPress={exchange}
            style={[styles.button, !selectedIds.length && styles.disabled]}
          >
            <Text style={styles.buttonText}>선택 카드 판매</Text>
          </TouchableOpacity>

          <View style={styles.valueTable}>
            <Text style={styles.heading}>카드 기본 가치</Text>
            <Text style={styles.tableNote}>1강 가치 × 강화 단계</Text>
            <View style={styles.tableRow}>
              <Text style={styles.tableGrade}>등급</Text>
              <Text style={styles.tableNumber}>1강</Text>
              <Text style={styles.tableNumber}>10강</Text>
            </View>
            {(Object.keys(cardValues.grades) as CardGrade[]).map((grade) => (
              <View key={grade} style={styles.tableRow}>
                <Text style={styles.tableGrade}>
                  {cardValues.grades[grade].label}
                </Text>
                <Text style={styles.tableNumber}>
                  {format(getCardCrystalValue(grade, 1))}
                </Text>
                <Text style={styles.tableNumber}>
                  {format(getCardCrystalValue(grade, 10))}
                </Text>
              </View>
            ))}
            <Text style={styles.tableNote}>단위: 결정</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.rateCard}>
            <Text style={styles.muted}>결정 교환 비율</Text>
            <Text style={styles.rate}>
              {format(cardValues.crystalsPerPoint)}결정 = 1포인트
            </Text>
          </View>
          <Text style={styles.heading}>교환할 결정</Text>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="교환할 결정 수량"
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="결정 수량 입력"
              placeholderTextColor="#64748B"
              style={styles.input}
              maxLength={15}
            />
            <Text style={styles.unit}>결정</Text>
          </View>
          <View style={styles.presets}>
            {[1, 10, 100].map((points) => (
              <TouchableOpacity
                key={points}
                accessibilityRole="button"
                onPress={() =>
                  setAmount(String(points * cardValues.crystalsPerPoint))
                }
                style={styles.preset}
              >
                <Text style={styles.presetText}>
                  {format(points * cardValues.crystalsPerPoint)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!validAmount && (
            <Text style={styles.error}>0 이상의 정수로 입력해 주세요.</Text>
          )}
          <View style={styles.summary} accessibilityLiveRegion="polite">
            <Text style={styles.muted}>받을 포인트</Text>
            <Text style={styles.total}>
              {format(quote.points)} <Text style={styles.unit}>P</Text>
            </Text>
            <Text style={styles.summaryNote}>
              사용 결정 {format(quote.cost)}개
            </Text>
            <Text style={styles.summaryNote}>
              입력 수량 중 교환하지 않는 결정 {format(quote.remainder)}개
            </Text>
          </View>
          <Text style={styles.muted}>
            포인트는 정수 단위로 교환하며, 남은 결정은 소모하지 않아요.
          </Text>
          <Text style={styles.muted}>
            보유 결정 {format(game.crystalBalance ?? 0)}개
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={
              !validAmount ||
              quote.points < 1 ||
              quote.cost > (game.crystalBalance ?? 0)
            }
            onPress={exchange}
            style={[
              styles.button,
              (!validAmount ||
                quote.points < 1 ||
                quote.cost > (game.crystalBalance ?? 0)) &&
                styles.disabled,
            ]}
          >
            <Text style={styles.buttonText}>포인트로 교환</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
