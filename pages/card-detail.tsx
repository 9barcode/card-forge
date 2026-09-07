import { styles } from '../assets/sytle/card-detail.style';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { cardService } from '../src/services/cardService';

export const Route = createRoute('/card-detail', {
  validateParams: (params) => params,
  component: CardDetailPage,
});

function CardDetailPage() {
  const navigation = useNavigation();
  const { id: cardId } = Route.useParams() as { id?: string };
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cardId) {
      setLoading(true);
      cardService
        .getCardDetail(cardId)
        .then(setCard)
        .finally(() => setLoading(false));
    }
  }, [cardId]);

  const handleGoToForge = () => {
    if (!card) return;
    // 강화소(/forge) 페이지로 cardId 파라미터 전달하며 이동
    navigation.navigate('/forge' as any, { cardId: card.id });
  };

  if (loading || !card) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3182F6" />
        <Text style={styles.loadingText}>카드 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.detailCard}>
        <Text style={styles.element}>{card.element} 원소</Text>
        <Text style={styles.name}>{card.name}</Text>
        <Text style={styles.level}>강화 단계: +{card.enhanceLevel}</Text>
        <Text style={styles.description}>{card.description}</Text>
      </View>

      <TouchableOpacity 
        style={styles.forgeButton}
        onPress={handleGoToForge}
      >
        <Text style={styles.buttonText}>이 카드로 강화하러 가기</Text>
      </TouchableOpacity>
    </View>
  );
}
