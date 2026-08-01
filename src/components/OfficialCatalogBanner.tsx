import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';

export function OfficialCatalogBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Official catalog not generated</Text>
      <Text style={styles.text}>
        Data comes from the official site (OP-15, PRB-02, etc.). In the project
        terminal run:
      </Text>
      <Text style={styles.code}>npm run sync:official</Text>
      <Text style={styles.text}>
        Then restart the app (npx expo start --web --clear).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  title: { color: colors.accent, fontWeight: '700', fontSize: 16, marginBottom: spacing.sm },
  text: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.xs },
  code: {
    color: colors.text,
    fontFamily: 'monospace',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
});
