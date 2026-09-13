import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ImageBackground,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../assets/sytle/forge.style';
import { cardOutlineColors } from '../src/components/card';
import { CardArtwork } from '../src/components/card-artwork';
import { CardPicker } from '../src/components/card-picker';
import { DevRewardedAdToggle } from '../src/components/dev-rewarded-ad-toggle';
import { MaxLevelAura } from '../src/components/max-level-aura';
import {
  gameRuntime,
  gradeLabels,
  useGameCache,
} from '../src/features/game-cache';
import {
  MAX_ENHANCEMENT_LEVEL,
  getEnhancementSuccessRate,
} from '../src/services/enhancementService';
import {
  isRewardedAdSuccess,
  rewardedAdService,
} from '../src/services/rewardedAdService';

export const Route = createRoute('/forge', {
  validateParams: (params) => params,
  component: ForgePage,
});

type Phase = 'idle' | 'loading' | 'ad' | 'striking' | 'result';

export function ForgePage() {
  const game = useGameCache();
  const routeCardId = (Route?.useParams?.() as { cardId?: string } | undefined)
    ?.cardId;
  const [selectedId, setSelectedId] = useState<string | null>(
    routeCardId ?? null,
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<'SUCCESS' | 'FAILURE' | null>(null);
  const [attemptedLevel, setAttemptedLevel] = useState<number | null>(null);
  const [strikeCount, setStrikeCount] = useState(0);
  const [error, setError] = useState('');
  const [devUserEarnedReward, setDevUserEarnedReward] = useState(true);
  const busy = useRef(false);
  const activeStrike = useRef<Animated.CompositeAnimation | null>(null);
  const hammerProgress = useRef(new Animated.Value(0)).current;
  const impactProgress = useRef(new Animated.Value(0)).current;
  const selected = game.cards.find((card) => card.cardId === selectedId);
  const unavailable =
    !selected ||
    selected.status !== 'ENHANCEABLE' ||
    selected.enhancementLevel >= MAX_ENHANCEMENT_LEVEL;
  const rate =
    selected && !unavailable
      ? getEnhancementSuccessRate(
          selected.enhancementLevel,
          selected.grade,
        )
      : null;
  const displayedLevel =
    phase === 'striking' && attemptedLevel !== null
      ? attemptedLevel
      : selected?.enhancementLevel;
  const failed = phase === 'result' && result === 'FAILURE';

  useEffect(() => {
    if (phase !== 'striking') return;

    let cancelled = false;
    const runStrike = (count: number) => {
      if (cancelled) return;
      setStrikeCount(count);
      hammerProgress.setValue(0);
      impactProgress.setValue(0);

      const animation = Animated.sequence([
        Animated.timing(hammerProgress, {
          toValue: 1,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(impactProgress, {
            toValue: 1,
            duration: 70,
            useNativeDriver: true,
          }),
          Animated.timing(hammerProgress, {
            toValue: 0.72,
            duration: 70,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(hammerProgress, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(impactProgress, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(140),
      ]);
      activeStrike.current = animation;
      animation.start(({ finished }) => {
        if (!finished || cancelled) return;
        if (count < 3) {
          runStrike(count + 1);
          return;
        }
        activeStrike.current = null;
        setStrikeCount(0);
        setPhase('result');
        busy.current = false;
      });
    };

    runStrike(1);
    return () => {
      cancelled = true;
      activeStrike.current?.stop();
      activeStrike.current = null;
    };
  }, [hammerProgress, impactProgress, phase]);

  const enhance = async () => {
    if (!selected || unavailable || busy.current || phase !== 'idle') return;
    busy.current = true;
    setError('');
    setResult(null);
    setAttemptedLevel(selected.enhancementLevel);
    setPhase('loading');
    try {
      await rewardedAdService.load();
      setPhase('ad');
      const ad = await rewardedAdService.show(devUserEarnedReward);
      const rewardSuccess = isRewardedAdSuccess(ad);
      if (!rewardSuccess) {
        throw new Error('REWARDED_AD_REWARD_FAILED');
      }

      const outcome = await gameRuntime.actions.enhanceCard({
        accessToken: gameRuntime.requireAccessToken(),
        requestId: gameRuntime.nextRequestId(),
        cardId: selected.cardId,
      });
      setResult(outcome.result);
      setPhase('striking');
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      setError(
        code === 'REWARDED_AD_NOT_SUPPORTED'
          ? '현재 환경에서는 광고를 재생할 수 없어요. 토스 앱에서 다시 실행해 주세요.'
          : code === 'REWARDED_AD_DISMISSED_WITHOUT_REWARD' ||
              code === 'REWARDED_AD_REWARD_FAILED'
            ? '광고를 끝까지 시청해야 강화를 시도할 수 있어요.'
            : '강화를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
      setAttemptedLevel(null);
      setPhase('idle');
      busy.current = false;
    }
  };

  const hammerStyle = {
    opacity: hammerProgress.interpolate({
      inputRange: [0, 0.05, 1],
      outputRange: [0.82, 1, 1],
    }),
    transform: [
      {
        translateY: hammerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-150, 20],
        }),
      },
      {
        rotate: hammerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: ['-38deg', '8deg'],
        }),
      },
    ],
  };
  const impactStyle = {
    opacity: impactProgress,
    transform: [
      {
        scale: impactProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.35],
        }),
      },
    ],
  };
  const overlayShakeStyle = {
    transform: [
      {
        translateX: impactProgress.interpolate({
          inputRange: [0, 0.35, 0.7, 1],
          outputRange: [0, -7, 6, 0],
        }),
      },
    ],
  };
  const failedImageStyle =
    Platform.OS === 'ios'
      ? styles.failedImageIos
      : styles.failedImageGrayscale;

  return (
    <ImageBackground
      source={require('../assets/images/index/index.jpg')}
      resizeMode="cover"
      style={styles.background}
    >
      <View pointerEvents="none" style={styles.shade} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.title}>카드 강화소</Text>
        <Text style={styles.subtitle}>
          보유 카드 중 원하는 카드를 선택하세요.
        </Text>
        <Text style={styles.previewNote}>
          화면은 캐시를 표시하고 결과는 서버가 확정해요
        </Text>
        <View style={styles.stage} accessibilityLiveRegion="polite">
          {phase === 'result' && result && (
            <Text
              style={[
                styles.resultTitle,
                result === 'FAILURE' && styles.failure,
              ]}
            >
              {result === 'SUCCESS' ? '강화 성공!' : '강화 실패'}
            </Text>
          )}
          {selected ? (
            <View style={styles.strikeScene}>
              <View style={styles.cardGlow}>
                <MaxLevelAura
                  level={displayedLevel ?? 0}
                  borderRadius={15}
                />
                <View
                  style={[
                    styles.cardFrame,
                    { borderColor: cardOutlineColors[selected.grade] },
                    failed && styles.failedCardFrame,
                  ]}
                >
                  <CardArtwork
                    imageKey={selected.imageKey}
                    thumbnail
                    style={[styles.heroCard, failed && failedImageStyle]}
                    resizeMode="cover"
                    accessibilityLabel={`${selected.name} ${gradeLabels[selected.grade]} ${displayedLevel}강`}
                  />
                  {failed && (
                    <View pointerEvents="none" style={styles.failedShade} />
                  )}
                  <View
                    style={[
                      styles.gradeBadge,
                      { backgroundColor: cardOutlineColors[selected.grade] },
                    ]}
                  >
                    <Text style={styles.gradeText}>
                      {gradeLabels[selected.grade]}
                    </Text>
                  </View>
                  <View style={styles.heroLevelBadge}>
                    <Text style={styles.heroLevelText}>
                      {displayedLevel}강
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✦</Text>
              <Text style={styles.emptyText}>
                강화할 카드를{'\n'}선택해 주세요
              </Text>
            </View>
          )}
          <Text style={styles.stageText}>
            {phase === 'ad'
              ? '광고 시청이 끝나면 강화가 시작돼요'
              : phase === 'striking'
                ? `모루를 두드리는 중… ${strikeCount}/3`
                : phase === 'result' && result
                  ? result === 'SUCCESS'
                    ? '강화 단계가 캐시에 반영됐어요.'
                    : '현재 단계는 유지되고 추가 강화가 잠겼어요.'
                  : selected?.status === 'ENHANCEMENT_LOCKED'
                    ? '강화 실패로 추가 강화가 잠긴 카드예요.'
                    : selected?.status === 'MAX_LEVEL'
                      ? '최고 강화 단계에 도달했어요.'
                      : selected
                        ? `${selected.enhancementLevel}강 → ${selected.enhancementLevel + 1}강 · 성공 확률 ${rate}%`
                        : '아래 보유 카드 중 원하는 카드 한 장을 골라주세요.'}
          </Text>
        </View>
        <CardPicker
          cards={game.cards}
          selectedId={selectedId}
          disabled={phase !== 'idle'}
          onSelect={(cardId) => {
            setSelectedId(cardId);
            setError('');
            setResult(null);
            setAttemptedLevel(null);
          }}
        />
        <View style={styles.actions}>
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {phase === 'result' ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.button}
              onPress={() => {
                setResult(null);
                setAttemptedLevel(null);
                setPhase('idle');
              }}
            >
              <Text style={styles.buttonText}>확인</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.hint}>
                광고 완료 후 선택한 카드 한 장만 강화해요.
              </Text>
              <DevRewardedAdToggle
                value={devUserEarnedReward}
                disabled={phase !== 'idle'}
                onChange={setDevUserEarnedReward}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="강화 시도"
                disabled={unavailable || phase !== 'idle'}
                onPress={enhance}
                style={[
                  styles.button,
                  (unavailable || phase !== 'idle') && styles.disabled,
                ]}
              >
                {phase !== 'idle' && <ActivityIndicator color="#292015" />}
                <Text style={styles.buttonText}>
                  {phase === 'loading'
                    ? '광고 준비 중'
                    : phase === 'ad'
                      ? '광고 시청 중'
                      : phase === 'striking'
                        ? `강화 중 ${strikeCount}/3`
                        : unavailable
                          ? '강화할 수 없음'
                          : '강화 시도'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
      {phase === 'striking' && selected && (
        <Animated.View
          accessible
          accessibilityLabel={`카드 강화 중, 모루 타격 ${strikeCount}/3`}
          style={[styles.strikeOverlay, overlayShakeStyle]}
        >
          <CardArtwork
            imageKey={selected.imageKey}
            thumbnail
            style={styles.strikeBackdrop}
            resizeMode="cover"
            blurRadius={18}
          />
          <View style={styles.strikeBackdropShade} />
          <View style={styles.forgeVignette} />
          <Text style={styles.forgeCaption}>CARD ENHANCEMENT</Text>
          <View style={styles.fullForgeScene}>
            <Animated.View style={[styles.fullHammer, hammerStyle]}>
              <Text style={styles.fullHammerIcon}>🔨</Text>
            </Animated.View>
            <View style={styles.anvil}>
              <View style={styles.anvilTop} />
              <View style={styles.heatedMetal} />
              <View style={styles.anvilStem} />
              <View style={styles.anvilBase} />
            </View>
            <Animated.View
              pointerEvents="none"
              style={[styles.fullImpact, impactStyle]}
            >
              <Text style={styles.sparkText}>✦  ✦  ✦</Text>
              <Text style={styles.bangText}>탕!</Text>
            </Animated.View>
          </View>
          <Text style={styles.strikeProgress}>
            강화 중 · {strikeCount}/3
          </Text>
        </Animated.View>
      )}
    </ImageBackground>
  );
}
