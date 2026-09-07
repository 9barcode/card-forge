import { styles } from '../assets/sytle/forge.style';
import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, ImageBackground, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { enhancementService, getEnhancementSuccessRate, MAX_ENHANCEMENT_LEVEL, type EnhancementResult } from '../src/services/enhancementService';
import { rewardedAdService } from '../src/services/rewardedAdService';

export const Route = createRoute('/forge', { validateParams: (params) => params, component: ForgePage });

const initialCards = [
  { id: 'preview-earth', name: '땅 · 노말', level: 1, image: require('../assets/images/cards/earth_normal.png') },
  { id: 'preview-water', name: '물 · 레어', level: 5, image: require('../assets/images/cards/water_rare.png') },
  { id: 'preview-fire', name: '불 · 레전더리', level: 9, image: require('../assets/images/cards/fire_legendary.png') },
];
type Phase = 'idle' | 'loading' | 'ad' | 'effect' | 'result';

export function ForgePage() {
  const [cards, setCards] = useState(initialCards);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<EnhancementResult | null>(null);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const mounted = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const selected = cards.find((card) => card.id === selectedId);
  const maxed = !!selected && selected.level >= MAX_ENHANCEMENT_LEVEL;
  const rate = selected && !maxed ? getEnhancementSuccessRate(selected.level) : null;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; progress.stopAnimation(); };
  }, [progress]);

  useEffect(() => {
    if (phase !== 'effect' || !result || !selectedId) return;
    progress.setValue(0);
    const effect = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0.2, duration: 180, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0.3, duration: 180, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]);
    effect.start(({ finished }) => {
      if (!finished || !mounted.current) return;
      setCards((items) => items.map((card) => card.id === selectedId ? { ...card, level: result.level } : card));
      setPhase('result');
      busy.current = false;
    });
    return () => effect.stop();
  }, [phase, progress, result, selectedId]);

  const enhance = async () => {
    if (!selected || maxed || busy.current || phase !== 'idle') return;
    busy.current = true;
    setError('');
    setResult(null);
    setPhase('loading');
    try {
      await rewardedAdService.load();
      if (!mounted.current) return;
      setPhase('ad');
      await rewardedAdService.show();
      if (!mounted.current) return;
      const outcome = await enhancementService.enhanceCard({ cardId: selected.id, currentLevel: selected.level });
      if (!mounted.current) return;
      setResult(outcome);
      setPhase('effect');
    } catch (reason) {
      if (!mounted.current) return;
      const code = reason instanceof Error ? reason.message : '';
      setError(code === 'REWARDED_AD_NOT_SUPPORTED'
        ? '현재 환경에서는 광고를 재생할 수 없어요. 토스 앱에서 다시 실행해 주세요.'
        : code === 'REWARDED_AD_DISMISSED_WITHOUT_REWARD'
          ? '광고를 끝까지 시청해야 강화를 시도할 수 있어요.'
          : '강화를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setPhase('idle');
      busy.current = false;
    }
  };

  return (
    <ImageBackground source={require('../assets/images/index/index.jpg')} resizeMode="cover" style={styles.background}>
      <View pointerEvents="none" style={styles.shade} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.title}>카드 강화소</Text>
        <Text style={styles.subtitle}>카드에 더 강한 원소의 힘을 담아보세요.</Text>
        <Text style={styles.previewNote}>체험용 임시 카드 · 화면을 나가면 초기화돼요</Text>

        <View style={styles.stage} accessibilityLiveRegion="polite">
          {phase === 'result' && result && <Text style={[styles.resultTitle, result.status === 'FAIL' && styles.failure]}>{result.status === 'SUCCESS' ? '강화 성공!' : '강화 실패'}</Text>}
          {selected ? (
            <Animated.View style={[styles.cardFrame, phase === 'effect' && {
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
              transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] }) }, { rotate: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-4deg', '4deg', '0deg'] }) }],
            }]}>
              <Image source={selected.image} style={styles.heroCard} accessibilityLabel={`${selected.name} ${selected.level}강`} />
              <Text style={styles.level}>[{selected.level}강]</Text>
              {phase === 'effect' && <Text style={styles.flash}>✦</Text>}
            </Animated.View>
          ) : <View style={styles.emptyCard}><Text style={styles.emptyIcon}>✦</Text><Text style={styles.emptyText}>강화할 카드를{ '\n' }선택해 주세요</Text></View>}
          <Text style={styles.stageText}>{phase === 'effect' ? '원소의 힘을 불어넣고 있어요…' : phase === 'result' && result ? result.status === 'SUCCESS' ? `${result.previousLevel}강 → ${result.level}강으로 강화됐어요` : `${result.level}강이 유지돼요. 다시 도전해 보세요.` : selected ? maxed ? '최고 강화 단계에 도달했어요' : `${selected.level}강 → ${selected.level + 1}강 · 성공 확률 ${rate}%` : '아래 임시 카드 중 한 장을 골라주세요'}</Text>
        </View>

        <View style={styles.picker}>
          {cards.map((card) => (
            <TouchableOpacity key={card.id} accessibilityRole="radio" accessibilityLabel={`${card.name} 선택`} accessibilityState={{ selected: selectedId === card.id, disabled: phase !== 'idle' }} disabled={phase !== 'idle'} style={[styles.option, selectedId === card.id && styles.selectedOption]} onPress={() => { setSelectedId(card.id); setError(''); }}>
              <Image source={card.image} style={styles.thumbnail} />
              <Text style={styles.optionName}>{card.name}</Text><Text style={styles.optionLevel}>{card.level}강</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.actions}>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {phase === 'result' ? <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { setResult(null); setPhase('idle'); }}><Text style={styles.buttonText}>확인</Text></TouchableOpacity> : <>
            <Text style={styles.hint}>광고 시청 완료 후 강화해요 · 실패 시 현재 단계 유지</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="강화 시도" disabled={!selected || maxed || phase !== 'idle'} onPress={enhance} style={[styles.button, (!selected || maxed || phase !== 'idle') && styles.disabled]}>
              {phase !== 'idle' && <ActivityIndicator color="#292015" />}
              <Text style={styles.buttonText}>{phase === 'loading' ? '광고 준비 중' : phase === 'ad' ? '광고 시청 중' : phase === 'effect' ? '강화 중' : maxed ? '최대 강화 완료' : '강화 시도'}</Text>
            </TouchableOpacity>
          </>}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
