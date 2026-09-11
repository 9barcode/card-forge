import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0E1118',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  description: {
    color: '#AAB2C0',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#273142',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  logBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#151B25',
  },
  logText: {
    color: '#D8DEE9',
    fontSize: 11,
    lineHeight: 17,
  },
  emptyText: {
    color: '#768196',
    fontSize: 13,
  },
});
