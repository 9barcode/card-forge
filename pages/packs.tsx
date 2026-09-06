import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { packService, type PackReward } from '../src/services/packService';
import { rewardedAdService } from '../src/services/rewardedAdService';

export const Route = createRoute('/packs', {
  validateParams: (params) => params,
  component: PacksPage,
});

type Phase = 'idle' | 'loading' | 'ad' | 'drawing' | 'result';
export function PacksPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [reward, setReward] = useState<PackReward | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; animation.stopAnimation(); };
  }, [animation]);

  useEffect(() => {
    if (phase !== 'drawing') return;
    animation.setValue(0);
    const effect = Animated.sequence([
      Animated.timing(animation, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(animation, { toValue: 0.4, duration: 250, useNativeDriver: true }),
      Animated.timing(animation, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]);
    effect.start(({ finished }) => {
      if (finished && mounted.current) { setPhase('result'); busy.current = false; }
    });
    return () => effect.stop();
  }, [phase, animation]);

  const draw = async () => {
    if (busy.current || phase !== 'idle') return;
    busy.current = true;
    setMessage('');
    setPhase('loading');
    try {
      await rewardedAdService.load();
      if (!mounted.current) return;
      setPhase('ad');
      await rewardedAdService.show();
      if (!mounted.current) return;
      const cards = await packService.openPack('NORMAL');
      if (!mounted.current) return;
      const card = cards[0];
      if (!card) throw new Error('EMPTY_PACK');
      setReward(card);
      setPhase('drawing');
    } catch (error) {
      if (!mounted.current) return;
      setMessage(error instanceof Error && error.message === 'REWARDED_AD_NOT_SUPPORTED'
        ? '현재 환경에서는 광고를 재생할 수 없어요. 토스 앱에서 다시 실행해 주세요.'
        : error instanceof Error && error.message === 'REWARDED_AD_DISMISSED_WITHOUT_REWARD'
        ? '광고를 끝까지 시청해야 카드를 뽑을 수 있어요.'
        : '카드 뽑기를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setPhase('idle');
      busy.current = false;
    }
  };

  const reset = () => { setReward(null); setPhase('idle'); };
  return (
    <ImageBackground source={require('../assets/images/index/index.jpg')} resizeMode="cover" style={styles.background}>
      <View pointerEvents="none" style={styles.shade} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.title}>카드 상점</Text>
        <Text style={styles.subtitle}>카드를 뽑는 장소입니다.</Text>

        <View style={styles.stage} accessibilityLiveRegion="polite">
          {phase === 'result' && reward ? (
            <>
              <Text style={styles.resultTitle}>카드 당첨!</Text>
              <View style={styles.rewardCard}>
                <Image source={reward.image} style={styles.cardImage} resizeMode="contain" accessibilityLabel={`${reward.elementLabel} ${reward.rarityLabel}`} />
                <Text style={styles.enhancement}>[{reward.enhanceLevel}강]</Text>
              </View>
              <Text style={styles.resultName}>{reward.elementLabel} · {reward.rarityLabel}</Text>
            </>
          ) : (
            <>
              <Animated.View style={[styles.sealedCard, phase === 'drawing' && {
                opacity: animation.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [{ scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] }) },
                  { rotate: animation.interpolate({ inputRange: [0, 0.4, 1], outputRange: ['-5deg', '5deg', '0deg'] }) }],
              }]}>
                <Text style={styles.sparkle}>✦</Text>
                <Text style={styles.cardBackTitle}>CARD{ '\n' }FORGE</Text>
                <Text style={styles.cardBackCaption}>여섯 원소의 힘</Text>
              </Animated.View>
              <Text style={styles.stageText}>{phase === 'drawing' ? '원소의 힘이 모이고 있어요…' : phase === 'ad' ? '광고 시청이 끝나면 뽑기가 시작돼요' : '어떤 원소의 카드가 기다리고 있을까요?'}</Text>
            </>
          )}
        </View>

        <View style={styles.actions}>
          {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
          {phase === 'result' ? (
            <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={reset}>
              <Text style={styles.buttonText}>확인</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.hint}>광고 시청 완료 후 카드 1장을 뽑아요</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="카드 뽑기"
                disabled={phase !== 'idle'}
                onPress={draw}
                style={[styles.button, phase !== 'idle' && styles.disabled]}>
                {phase !== 'idle' && <ActivityIndicator color="#292015" />}
                <Text style={styles.buttonText}>{phase === 'drawing' ? '카드 뽑는 중' : phase === 'ad' ? '광고 시청 중' : phase === 'loading' ? '광고 준비 중' : '카드 뽑기'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#12151D' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 12, 20, 0.75)' },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, alignItems: 'center' },
  eyebrow: { color: '#D5B87F', fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  title: { fontSize: 30, color: '#FFF5E3', fontWeight: '800', marginTop: 10 },
  subtitle: { color: '#CCC8C0', fontSize: 15, marginTop: 10 },
  stage: { flex: 1, minHeight: 390, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  sealedCard: { width: 192, height: 270, borderRadius: 14, borderWidth: 2, borderColor: '#D4B16A', backgroundColor: '#192432', alignItems: 'center', justifyContent: 'center', shadowColor: '#EAC681', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  sparkle: { color: '#EFCE89', fontSize: 62 },
  cardBackTitle: { color: '#F4E2B8', fontSize: 25, fontWeight: '800', letterSpacing: 4, textAlign: 'center', marginTop: 10 },
  cardBackCaption: { color: '#AFB5BE', fontSize: 12, marginTop: 20 },
  stageText: { color: '#E4D9C4', textAlign: 'center', fontSize: 14, marginTop: 30 },
  resultTitle: { color: '#F5D390', fontSize: 25, fontWeight: '800', marginBottom: 20 },
  rewardCard: { width: 192, height: 270 },
  cardImage: { width: '100%', height: '100%' },
  enhancement: { position: 'absolute', bottom: 27, alignSelf: 'center', color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  resultName: { color: '#FFF5E3', fontSize: 17, marginTop: 18 },
  actions: { width: '100%', maxWidth: 420, gap: 12 },
  hint: { color: '#C6C6CB', fontSize: 13, textAlign: 'center' },
  button: { backgroundColor: '#EAC681', minHeight: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, padding: 14 },
  buttonText: { color: '#292015', fontSize: 18, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  message: { color: '#F1C6AD', textAlign: 'center', fontSize: 13, lineHeight: 20 },
});
