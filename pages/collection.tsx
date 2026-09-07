import { styles } from '../assets/sytle/collection.style';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
// TODO: cardService 등 수집 데이터 서비스가 있다면 import
// import { cardService } from '../src/services/cardService';

export const Route = createRoute('/collection', {
  validateParams: (params) => params,
  component: CollectionPage,
});

function CollectionPage() {
  const navigation = useNavigation();
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    // TODO: 수집 도감 목록 데이터 로드 로직 구현
    // cardService.getCollections().then(setCollections);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 원소 도감</Text>
      
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={[
              styles.status, 
              item.isCollected && styles.collectedStatus
            ]}>
              {item.isCollected ? '수집 완료' : '미수집'}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>등록된 도감 정보가 없습니다.</Text>
          </View>
        }
      />
    </View>
  );
}
