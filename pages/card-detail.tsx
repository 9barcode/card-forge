import { createRoute, useNavigation } from '@granite-js/react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../assets/sytle/card-detail.style';
import {
  elementLabels,
  gradeLabels,
  useGameCache,
} from '../src/features/game-cache';

export const Route = createRoute('/card-detail', {
  validateParams: (params) => params,
  component: CardDetailPage,
});

function CardDetailPage() {
  const navigation = useNavigation();
  const { id: cardId } = Route.useParams() as { id?: string };
  const game = useGameCache();
  const card = game.cards.find((item) => item.cardId === cardId);

  const handleGoToForge = () => {
    if (!card) return;
    // 강화소(/forge) 페이지로 cardId 파라미터 전달하며 이동
    // biome-ignore lint/suspicious/noExplicitAny: Granite generated route types are stale until the next build.
    navigation.navigate('/forge' as any, { cardId: card.cardId });
  };

  if (!card) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>카드를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.detailCard}>
        <Text style={styles.element}>
          {elementLabels[card.element]} · {gradeLabels[card.grade]}
        </Text>
        <Text style={styles.name}>{card.name}</Text>
        <Text style={styles.level}>강화 단계: +{card.enhancementLevel}</Text>
        <Text style={styles.description}>
          {card.status === 'ENHANCEMENT_LOCKED'
            ? '강화 실패로 추가 강화가 잠긴 카드입니다.'
            : '원소의 힘을 품은 카드입니다.'}
        </Text>
      </View>

      <TouchableOpacity style={styles.forgeButton} onPress={handleGoToForge}>
        <Text style={styles.buttonText}>이 카드로 강화하러 가기</Text>
      </TouchableOpacity>
    </View>
  );
}
