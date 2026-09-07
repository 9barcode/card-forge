import { styles } from '../assets/sytle/_404.style';
import React from 'react';
import { Text, View } from 'react-native';

export default function NotFoundPage() {
  return (
    <View style={styles.container}>
      <Text>404 Not Found</Text>
    </View>
  );
}
