import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101722' },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 42 },
  header: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#3A4655', backgroundColor: '#192432', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF5E3', fontSize: 22, fontWeight: '800' },
  headerSpacer: { width: 40, height: 40 },
  settingCard: { marginTop: 28, paddingHorizontal: 22, paddingVertical: 28, borderRadius: 20, borderWidth: 1, borderColor: '#3A4655', backgroundColor: '#192432', alignItems: 'center' },
  iconWrap: { width: 54, height: 54, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(213,184,127,0.45)', backgroundColor: 'rgba(213,184,127,0.08)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#F5F1E9', fontSize: 17, fontWeight: '700', marginTop: 16 },
  cardDescription: { color: '#929FAF', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
});
