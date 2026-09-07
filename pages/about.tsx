import { styles } from '../assets/sytle/about.style';
import React from 'react';
import { View, Text } from 'react-native';
import { createRoute } from '@granite-js/react-native';

export const Route = createRoute('/about', {
  validateParams: (params) => params,
  component: AboutPage,
});

function AboutPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>About</Text>
    </View>
  );
}
