import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';

interface CollectionToastProps {
  message: string | null;
  onHide?: () => void;
  /** When true, parent controls position (e.g. inside modal overlay). */
  inline?: boolean;
}

export function CollectionToast({ message, onHide, inline }: CollectionToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    translateY.setValue(-16);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 280, useNativeDriver: true }),
      ]).start(() => onHide?.());
    }, 2400);
    return () => clearTimeout(t);
  }, [message, onHide, opacity, translateY]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        inline && styles.toastInline,
        { opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: 'center',
    zIndex: 200,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.goldBright,
    maxWidth: '92%',
    ...StyleSheet.flatten({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 10,
    }),
  },
  toastInline: {
    position: 'relative',
  },
  text: {
    color: '#1a1000',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
});
