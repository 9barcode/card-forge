import { createRoute, useNavigation } from '@granite-js/react-native';
import React from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from '../assets/sytle/cards.style';
import {
  type CardGrade,
  elementLabels,
  getCardImage,
  gradeLabels,
  useGameCache,
} from '../src/features/game-cache';

export const Route = createRoute('/cards', {
  validateParams: (params) => params,
  component: CardsPage,
});

const rarityColors: Record<CardGrade, string> = {
  NORMAL: '#AAB2BD',
  MAGIC: '#76CFA3',
  RARE: '#72B6FF',
  SUPER_RARE: '#C497FF',
  UNIQUE: '#FFAF72',
  LEGENDARY: '#FFE080',
};

export function CardsPage() {
  const navigation = useNavigation();
  const game = useGameCache();
  const cards = game.cards;
  const cardColumns = cards.length === 4 ? 2 : 3;

  return (
    <ImageBackground
      source={require('../assets/images/index/index.jpg')}
      resizeMode="cover"
      style={styles.background}
    >
      <View pointerEvents="none" style={styles.shade} />
      <View style={styles.container}>
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.title}>카드 보관함</Text>
        <Text style={styles.subtitle}>
          수집한 원소 카드를 확인하고 관리하세요.
        </Text>
        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>보유 카드</Text>
            <Text style={styles.summaryValue}>{cards.length}장</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.summaryLabel}>최고 강화</Text>
            <Text style={styles.summaryValue}>
              {cards.length
                ? Math.max(...cards.map((card) => card.enhancementLevel))
                : 0}
              강
            </Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={styles.summaryLabel}>원소 종류</Text>
            <Text style={styles.summaryValue}>
              {new Set(cards.map((card) => card.element)).size}종
            </Text>
          </View>
        </View>

        {
          <FlatList
            key={`cards-${cardColumns}`}
            data={cards}
            keyExtractor={(item) => item.cardId}
            numColumns={cardColumns}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>아직 보유한 카드가 없어요</Text>
                <Text style={styles.loading}>
                  카드 상점에서 첫 카드를 뽑아보세요.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${elementLabels[item.element]} ${gradeLabels[item.grade]} ${item.enhancementLevel}강 카드 상세 보기`}
                activeOpacity={0.82}
                onPress={() =>
                  // biome-ignore lint/suspicious/noExplicitAny: Granite generated route types are stale until the next build.
                  navigation.navigate('/card-detail' as any, {
                    id: item.cardId,
                  })
                }
                style={[
                  styles.cardItem,
                  cardColumns === 2
                    ? styles.twoColumnCard
                    : styles.threeColumnCard,
                  { borderColor: rarityColors[item.grade] },
                ]}
              >
                <View
                  style={[
                    styles.rarityBadge,
                    { backgroundColor: rarityColors[item.grade] },
                  ]}
                >
                  <Text style={styles.rarityText}>
                    {gradeLabels[item.grade]}
                  </Text>
                </View>
                <View style={styles.imageWrap}>
                  <Image
                    source={getCardImage(item.imageKey)}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>
                      {item.enhancementLevel}강
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.elementText}>
                  {elementLabels[item.element]} 원소
                </Text>
              </TouchableOpacity>
            )}
          />
        }
      </View>
    </ImageBackground>
  );
}
