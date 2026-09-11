import { createRoute } from '@granite-js/react-native';
import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../assets/sytle/debug-logs.style';
import { appLogger } from '../src/utils/appLogger';

export const Route = createRoute('/debug-logs', {
  validateParams: (params) => params,
  component: DebugLogsPage,
});

export function DebugLogsPage() {
  const [logText, setLogText] = useState(() => appLogger.getText());

  const refreshLogs = useCallback(() => {
    setLogText(appLogger.getText());
  }, []);

  const clearLogs = useCallback(() => {
    appLogger.clear();
    setLogText('');
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>앱 로그</Text>
        <Text style={styles.description}>
          QR 실기기 테스트용 로그입니다. getUserKeyForGame()에서 받은 hash와
          회원 세션 생성 결과를 확인할 수 있습니다.
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="앱 로그 새로고침"
            activeOpacity={0.8}
            onPress={refreshLogs}
            style={styles.button}
          >
            <Text style={styles.buttonText}>새로고침</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="앱 로그 지우기"
            activeOpacity={0.8}
            onPress={clearLogs}
            style={styles.button}
          >
            <Text style={styles.buttonText}>로그 지우기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logBox}>
          {logText.length > 0 ? (
            <Text selectable style={styles.logText}>
              {logText}
            </Text>
          ) : (
            <Text style={styles.emptyText}>아직 기록된 로그가 없습니다.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
