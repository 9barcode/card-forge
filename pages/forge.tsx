import { createRoute } from '@granite-js/react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../assets/sytle/forge.style';
import { CardPicker } from '../src/components/card-picker';
import {
  gameRuntime,
  getAdCompletionProof,
  getCardImage,
  useGameCache,
} from '../src/features/game-cache';
import {
  MAX_ENHANCEMENT_LEVEL,
  getEnhancementSuccessRate,
} from '../src/services/enhancementService';
import { rewardedAdService } from '../src/services/rewardedAdService';

export const Route = createRoute('/forge', {
  validateParams: (params) => params,
  component: ForgePage,
});
type Phase = 'idle' | 'loading' | 'ad' | 'result';

export function ForgePage() {
  const game = useGameCache();
  const routeCardId = (Route?.useParams?.() as { cardId?: string } | undefined)
    ?.cardId;
  const [selectedId, setSelectedId] = useState<string | null>(
    routeCardId ?? null,
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<'SUCCESS' | 'FAILURE' | null>(null);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const selected = game.cards.find((card) => card.cardId === selectedId);
  const unavailable =
    !selected ||
    selected.status !== 'ENHANCEABLE' ||
    selected.enhancementLevel >= MAX_ENHANCEMENT_LEVEL;
  const rate =
    selected && !unavailable
      ? getEnhancementSuccessRate(selected.enhancementLevel)
      : null;

  const enhance = async () => {
    if (!selected || unavailable || busy.current || phase !== 'idle') return;
    busy.current = true;
    setError('');
    setResult(null);
    setPhase('loading');
    try {
      await rewardedAdService.load();
      setPhase('ad');
      const ad = await rewardedAdService.show();
      const outcome = await gameRuntime.actions.enhanceCard({
        accessToken: gameRuntime.requireAccessToken(),
        requestId: gameRuntime.nextRequestId(),
        cardId: selected.cardId,
        adCompletionId: getAdCompletionProof(ad.completionId),
      });
      setResult(outcome.result);
      setPhase('result');
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      setError(
        code === 'REWARDED_AD_NOT_SUPPORTED'
          ? '현재 환경에서는 광고를 재생할 수 없어요. 토스 앱에서 다시 실행해 주세요.'
          : code === 'REWARDED_AD_DISMISSED_WITHOUT_REWARD'
            ? '광고를 끝까지 시청해야 강화를 시도할 수 있어요.'
            : '강화를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
      setPhase('idle');
    } finally {
      busy.current = false;
    }
  };

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
            <View style={styles.cardFrame}>
              <Image
                source={getCardImage(selected.imageKey)}
                style={styles.heroCard}
                accessibilityLabel={`${selected.name} ${selected.enhancementLevel}강`}
              />
              <Text style={styles.level}>[{selected.enhancementLevel}강]</Text>
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
              ? '광고 시청이 끝나면 강화 결과가 적용돼요'
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
                      : unavailable
                        ? '강화할 수 없음'
                        : '강화 시도'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}
