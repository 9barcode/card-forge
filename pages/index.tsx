import { createRoute, useNavigation } from '@granite-js/react-native';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AppRoutes = '/cards' | '/forge' | '/packs' | '/exchange';
type MenuItem = { path: AppRoutes; title: string; description: string; icon: number; accent: string };

export const Route = createRoute('/', { validateParams: (params) => params, component: HomePage });

const menuItems: MenuItem[] = [
  { path: '/cards', title: '카드 보관함', description: '수집한 원소 카드 확인', icon: require('../assets/images/index/보관함.png'), accent: '#72B6FF' },
  { path: '/forge', title: '카드 강화소', description: '광고를 보고 카드 강화', icon: require('../assets/images/index/강화소.png'), accent: '#FFAF72' },
  { path: '/packs', title: '카드 상점', description: '새로운 원소 카드 뽑기', icon: require('../assets/images/cards/dark_magic.png'), accent: '#C497FF' },
  { path: '/exchange', title: '포인트 교환소', description: '카드와 결정을 포인트로', icon: require('../assets/images/cards/light_unique.png'), accent: '#76CFA3' },
];

export function HomePage() {
  const navigation = useNavigation();
  const user = { nickname: '모험가', level: 1, crystals: 0 };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>CARD FORGE</Text>
        <Text style={styles.welcome}>다시 오셨군요, {user.nickname}</Text>
        <Text style={styles.subtitle}>오늘도 새로운 카드의 힘을 깨워보세요.</Text>

        <View style={styles.playerCard}>
          <View style={styles.glowLarge} /><View style={styles.glowSmall} />
          <View style={styles.playerInfo}>
            <Text style={styles.profileLabel}>CARD COLLECTOR</Text>
            <Text style={styles.nickname}>{user.nickname}</Text>
            <Text style={styles.levelText}>Lv. {user.level} · 카드 수집가</Text>
            <View style={styles.currencyCard}>
              <Text style={styles.crystalIcon}>◆</Text>
              <View><Text style={styles.currencyLabel}>보유 결정</Text><Text style={styles.currencyValue}>{user.crystals.toLocaleString('ko-KR')}</Text></View>
            </View>
          </View>
          <View style={styles.characterWrap}>
            <Image source={require('../assets/images/characters/rose.jpg')} style={styles.character} resizeMode="cover" />
            <View style={styles.characterShade} />
            <View style={styles.stars}><Text style={styles.starText}>★ ★ ★ ★ ★</Text></View>
          </View>
        </View>

        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.path} accessibilityRole="button" accessibilityLabel={`${item.title} 이동`} activeOpacity={0.82} onPress={() => navigation.navigate(item.path as any)} style={styles.menuCard}>
              <View style={[styles.iconWrap, { borderColor: item.accent }]}><Image source={item.icon} style={styles.icon} resizeMode="contain" /></View>
              <View style={styles.menuCopy}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuDescription}>{item.description}</Text></View>
              <Text style={[styles.arrow, { color: item.accent }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.guideCard}>
          <Text style={styles.guideMark}>✦</Text>
          <View style={styles.guideCopy}><Text style={styles.guideTitle}>카드를 뽑고 강화해 보세요</Text><Text style={styles.guideText}>수집한 카드는 결정으로 교환하고, 결정은 포인트로 바꿀 수 있어요.</Text></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101722' },
  content: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 42 },
  eyebrow: { color: '#D5B87F', fontSize: 11, letterSpacing: 4, fontWeight: '700' },
  welcome: { color: '#FFF5E3', fontSize: 26, fontWeight: '800', marginTop: 12 },
  subtitle: { color: '#AAB6C5', fontSize: 14, marginTop: 8 },
  playerCard: { height: 210, borderRadius: 22, backgroundColor: '#192432', borderWidth: 1, borderColor: '#3A4655', marginTop: 24, overflow: 'hidden', flexDirection: 'row' },
  glowLarge: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#26384B', left: -80, top: -100 },
  glowSmall: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#313443', left: 100, bottom: -80 },
  playerInfo: { flex: 1, padding: 20, justifyContent: 'center', zIndex: 2 },
  profileLabel: { color: '#D5B87F', fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  nickname: { color: '#FFF', fontSize: 25, fontWeight: '800', marginTop: 8 },
  levelText: { color: '#B0BBC9', fontSize: 12, marginTop: 4 },
  currencyCard: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 9, backgroundColor: 'rgba(234,198,129,0.1)', borderWidth: 1, borderColor: 'rgba(234,198,129,0.35)', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, marginTop: 17 },
  crystalIcon: { color: '#9DDCEC', fontSize: 17 },
  currencyLabel: { color: '#AAB6C5', fontSize: 9 },
  currencyValue: { color: '#F5F1E9', fontSize: 14, fontWeight: '800', marginTop: 1 },
  characterWrap: { width: '42%', height: '100%' },
  character: { width: '100%', height: '100%' },
  characterShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,23,34,0.15)' },
  stars: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingVertical: 7, backgroundColor: 'rgba(8,12,20,0.72)' },
  starText: { color: '#EAC681', fontSize: 10, letterSpacing: 2 },
  grid: { gap: 11, marginTop: 22 },
  menuCard: { minHeight: 82, backgroundColor: '#192432', borderWidth: 1, borderColor: '#344153', borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 54, height: 54, borderRadius: 15, borderWidth: 1, backgroundColor: '#111B28', alignItems: 'center', justifyContent: 'center' },
  icon: { width: 31, height: 31 },
  menuCopy: { flex: 1, marginLeft: 14 },
  menuTitle: { color: '#F5F1E9', fontSize: 16, fontWeight: '700' },
  menuDescription: { color: '#929FAF', fontSize: 12, marginTop: 5 },
  arrow: { fontSize: 29, marginHorizontal: 6 },
  guideCard: { flexDirection: 'row', backgroundColor: '#1B3040', borderRadius: 16, padding: 17, marginTop: 20, alignItems: 'center', gap: 14 },
  guideMark: { color: '#EAC681', fontSize: 26 },
  guideCopy: { flex: 1 },
  guideTitle: { color: '#E9EEF4', fontSize: 14, fontWeight: '700' },
  guideText: { color: '#A7BCCB', fontSize: 11, lineHeight: 17, marginTop: 5 },
});
