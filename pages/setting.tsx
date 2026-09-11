import { createRoute, useNavigation } from '@granite-js/react-native';
import { ChevronLeft, Settings } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../assets/sytle/setting.style';

export const Route = createRoute('/setting', {
  validateParams: (params) => params,
  component: SettingPage,
});

function SettingPage() {
  const navigation = useNavigation();

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // biome-ignore lint/suspicious/noExplicitAny: Granite generated route types are stale until the next build.
    navigation.navigate('/' as any);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="홈으로 돌아가기"
            activeOpacity={0.8}
            onPress={handleGoBack}
            style={styles.backButton}
          >
            <ChevronLeft color="#FFF5E3" size={20} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>설정</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.iconWrap}>
            <Settings color="#D5B87F" size={24} strokeWidth={2} />
          </View>
          <Text style={styles.cardTitle}>게임 설정</Text>
          <Text style={styles.cardDescription}>
            설정할 수 있는 항목을 준비하고 있습니다.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
