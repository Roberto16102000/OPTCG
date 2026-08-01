import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';

const PARTICLE_COUNT = 22;
const BURST_COLORS = [
  colors.gold,
  colors.goldBright,
  colors.bountyRed,
  colors.wave,
  colors.raritySr,
  colors.success,
];

export interface BurstOrigin {
  x: number;
  y: number;
}

interface CollectionBurstProps {
  /** Change to retrigger animation. */
  trigger: number;
  origin: BurstOrigin | null;
}

interface ParticleSpec {
  color: string;
  tx: number;
  ty: number;
  size: number;
}

function buildParticles(): ParticleSpec[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4;
    const dist = 55 + Math.random() * 75;
    return {
      color: BURST_COLORS[i % BURST_COLORS.length],
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      size: 6 + Math.floor(Math.random() * 5),
    };
  });
}

function ParticleView({
  spec,
  origin,
  progress,
}: {
  spec: ParticleSpec;
  origin: BurstOrigin;
  progress: Animated.Value;
}) {
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spec.tx],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spec.ty],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [1, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.1, 0.2],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: origin.x - spec.size / 2,
          top: origin.y - spec.size / 2,
          width: spec.size,
          height: spec.size,
          backgroundColor: spec.color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

export function CollectionBurst({ trigger, origin }: CollectionBurstProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const particles = useMemo(() => buildParticles(), [trigger]);

  useEffect(() => {
    if (!trigger || !origin) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 880,
      useNativeDriver: true,
    }).start();
  }, [trigger, origin, progress]);

  if (!trigger || !origin) return null;

  const { width, height } = Dimensions.get('window');

  return (
    <View style={[styles.layer, { width, height }]} pointerEvents="none">
      {particles.map((spec, i) => (
        <ParticleView key={`${trigger}-${i}`} spec={spec} origin={origin} progress={progress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 50,
  },
  particle: {
    position: 'absolute',
    borderRadius: 2,
  },
});
