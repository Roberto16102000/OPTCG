import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectionBurst, type BurstOrigin } from './CollectionBurst';
import { CollectionToast } from './CollectionToast';

export interface CollectionRewardEvent {
  message: string;
  origin?: BurstOrigin;
}

interface CollectionRewardOverlayProps {
  event: CollectionRewardEvent | null;
  onClear: () => void;
}

/** Toast + pack-open burst (same as web v2). */
export function CollectionRewardOverlay({ event, onClear }: CollectionRewardOverlayProps) {
  const insets = useSafeAreaInsets();
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (event?.origin) setBurstKey((k) => k + 1);
  }, [event]);

  if (!event) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <CollectionBurst trigger={burstKey} origin={event.origin ?? null} />
      <View style={[styles.toastSlot, { top: insets.top + 12 }]}>
        <CollectionToast message={event.message} onHide={onClear} inline />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  toastSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
