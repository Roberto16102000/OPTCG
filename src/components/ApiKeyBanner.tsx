import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';

export function ApiKeyBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>API key required</Text>
      <Text style={styles.text}>
        Create a .env file with EXPO_PUBLIC_APITCG_API_KEY=your_key and restart the app.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => Linking.openURL('https://www.apitcg.com/platform')}
      >
        <Text style={styles.buttonText}>Get free API key</Text>
      </Pressable>
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
    borderColor: colors.primary,
  },
  title: { color: colors.primary, fontWeight: '700', fontSize: 16, marginBottom: spacing.xs },
  text: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
