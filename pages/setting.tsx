import { createRoute, useNavigation } from '@granite-js/react-native';
import { ChevronLeft, ChevronRight, ImageIcon, Pencil } from 'lucide-react-native';
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

        <View style={styles.settingList}>
          <View style={styles.settingItem}>
            <View style={styles.itemIcon}>
              <Pencil color="#D5B87F" size={20} strokeWidth={2} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>캐릭터 이름변경</Text>
              <Text style={styles.itemDescription}>
                (100개 결정이 사용됩니다.)
              </Text>
            </View>
            <ChevronRight color="#7F8B9A" size={20} strokeWidth={2} />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.itemIcon}>
              <ImageIcon color="#D5B87F" size={20} strokeWidth={2} />
            </View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>캐릭터 이미지변경</Text>
              <Text style={styles.itemDescription}>
                (1000개 결정이 사용됩니다.)
              </Text>
            </View>
            <ChevronRight color="#7F8B9A" size={20} strokeWidth={2} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
