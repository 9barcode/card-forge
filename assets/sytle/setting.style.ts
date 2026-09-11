import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101722' },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 42 },
  header: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#3A4655', backgroundColor: '#192432', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF5E3', fontSize: 22, fontWeight: '800' },
  headerSpacer: { width: 40, height: 40 },
  settingList: { marginTop: 28, borderRadius: 18, borderWidth: 1, borderColor: '#3A4655', backgroundColor: '#192432', overflow: 'hidden' },
  settingItem: { minHeight: 84, paddingHorizontal: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(213,184,127,0.4)', backgroundColor: 'rgba(213,184,127,0.08)', alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, marginLeft: 14 },
  itemTitle: { color: '#F5F1E9', fontSize: 15, fontWeight: '700' },
  itemDescription: { color: '#929FAF', fontSize: 12, marginTop: 5 },
  divider: { height: 1, marginLeft: 72, backgroundColor: '#303D4E' },
});
