import { createRoute, useNavigation } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cardService, type UserCard } from '../src/services/cardService';

export const Route = createRoute('/cards', { validateParams: (params) => params, component: CardsPage });

const rarityColors: Record<UserCard['rarity'], string> = {
  NORMAL: '#AAB2BD', MAGIC: '#76CFA3', RARE: '#72B6FF', SUPER_RARE: '#C497FF', UNIQUE: '#FFAF72', LEGENDARY: '#FFE080',
};

export function CardsPage() {
  const navigation = useNavigation();
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void cardService.getUserCards().then((items) => { if (active) setCards(items); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <ImageBackground source={require('../assets/images/index/index.jpg')} resizeMode="cover" style={styles.background}>
      <View pointerEvents="none" style={styles.shade} />
      <View style={styles.container}>
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.title}>카드 보관함</Text>
        <Text style={styles.subtitle}>수집한 원소 카드를 확인하고 관리하세요.</Text>
        <View style={styles.summary}>
          <View><Text style={styles.summaryLabel}>보유 카드</Text><Text style={styles.summaryValue}>{cards.length}장</Text></View>
          <View style={styles.divider} />
          <View><Text style={styles.summaryLabel}>최고 강화</Text><Text style={styles.summaryValue}>{cards.length ? Math.max(...cards.map((card) => card.enhanceLevel)) : 0}강</Text></View>
          <View style={styles.divider} />
          <View><Text style={styles.summaryLabel}>원소 종류</Text><Text style={styles.summaryValue}>{new Set(cards.map((card) => card.element)).size}종</Text></View>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator color="#EAC681" /><Text style={styles.loading}>카드를 불러오고 있어요</Text></View> : (
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyTitle}>아직 보유한 카드가 없어요</Text><Text style={styles.loading}>카드 상점에서 첫 카드를 뽑아보세요.</Text></View>}
            renderItem={({ item }) => (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.elementLabel} ${item.rarityLabel} ${item.enhanceLevel}강 카드 상세 보기`} activeOpacity={0.82} onPress={() => navigation.navigate('/card-detail' as any, { id: item.id })} style={[styles.cardItem, { borderColor: rarityColors[item.rarity] }]}>
                <View style={[styles.rarityBadge, { backgroundColor: rarityColors[item.rarity] }]}><Text style={styles.rarityText}>{item.rarityLabel}</Text></View>
                <View style={styles.imageWrap}>
                  <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
                  <View style={styles.levelBadge}><Text style={styles.levelText}>{item.enhanceLevel}강</Text></View>
                </View>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.elementText}>{item.elementLabel} 원소</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#12151D' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 12, 20, 0.8)' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  eyebrow: { alignSelf: 'center', color: '#D5B87F', fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  title: { alignSelf: 'center', color: '#FFF5E3', fontSize: 30, fontWeight: '800', marginTop: 10 },
  subtitle: { alignSelf: 'center', color: '#CCC8C0', fontSize: 14, marginTop: 9 },
  summary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(25, 36, 50, 0.94)', borderWidth: 1, borderColor: '#3A4655', borderRadius: 15, paddingVertical: 15, marginTop: 22 },
  summaryLabel: { color: '#93A0B1', fontSize: 11, textAlign: 'center' },
  summaryValue: { color: '#F1DEC0', fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 5 },
  divider: { width: 1, height: 32, backgroundColor: '#3A4655' },
  list: { paddingTop: 18, paddingBottom: 36 },
  row: { gap: 12, marginBottom: 12 },
  cardItem: { flex: 1, maxWidth: '49%', backgroundColor: 'rgba(25, 36, 50, 0.96)', borderWidth: 1.5, borderRadius: 15, padding: 10, overflow: 'hidden' },
  rarityBadge: { position: 'absolute', top: 9, right: 9, zIndex: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rarityText: { color: '#20242B', fontSize: 9, fontWeight: '800' },
  imageWrap: { width: '100%', aspectRatio: 512 / 720, marginBottom: 10 },
  cardImage: { width: '100%', height: '100%' },
  levelBadge: { position: 'absolute', left: 7, bottom: 7, backgroundColor: 'rgba(8, 12, 20, 0.84)', borderColor: '#EAC681', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  levelText: { color: '#F5D390', fontSize: 11, fontWeight: '800' },
  cardName: { color: '#F5F1E9', fontSize: 14, fontWeight: '700' },
  elementText: { color: '#AAB6C5', fontSize: 11, marginTop: 5, marginBottom: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loading: { color: '#AAB6C5', fontSize: 13 },
  emptyTitle: { color: '#F5F1E9', fontSize: 17, fontWeight: '700' },
});
