import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function BannerAd() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>여기는 배너광고 위젯입니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 72,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#66758A',
    backgroundColor: '#192432',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#C6D1DF', fontSize: 14, textAlign: 'center' },
});
