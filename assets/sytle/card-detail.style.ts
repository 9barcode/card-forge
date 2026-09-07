import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6', padding: 16, justifyContent: 'space-between' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7684' },
  detailCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, alignItems: 'center' },
  element: { fontSize: 14, color: '#3182F6', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', marginVertical: 12, color: '#191F28' },
  level: { fontSize: 18, color: '#F04452', fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 14, color: '#6B7684', textAlign: 'center', lineHeight: 20 },
  forgeButton: { backgroundColor: '#3182F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
