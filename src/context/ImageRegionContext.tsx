import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ImageRegion } from '../constants/regions';
import type { OnePieceCard } from '../types/card';
import { getCardImageUri } from '../utils/cards';
import { resolveJapaneseImageUri } from '../api/jpImages';

const STORAGE_KEY = '@onepiece/image_region';

interface ImageRegionContextValue {
  region: ImageRegion;
  setRegion: (region: ImageRegion) => void;
  getDisplayImageUri: (card: OnePieceCard, size?: 'small' | 'large') => string | undefined;
}

const ImageRegionContext = createContext<ImageRegionContextValue | null>(null);

export function ImageRegionProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<ImageRegion>('global');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw === 'global' || raw === 'japanese') setRegionState(raw);
    });
  }, []);

  const setRegion = useCallback((next: ImageRegion) => {
    setRegionState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const getDisplayImageUri = useCallback(
    (card: OnePieceCard, size: 'small' | 'large' = 'small') => {
      if (region === 'japanese') {
        return resolveJapaneseImageUri(card);
      }
      return getCardImageUri(card, size);
    },
    [region]
  );

  const value = useMemo(
    () => ({
      region,
      setRegion,
      getDisplayImageUri,
    }),
    [region, setRegion, getDisplayImageUri]
  );

  return (
    <ImageRegionContext.Provider value={value}>{children}</ImageRegionContext.Provider>
  );
}

export function useImageRegion() {
  const ctx = useContext(ImageRegionContext);
  if (!ctx) {
    throw new Error('useImageRegion must be used within ImageRegionProvider');
  }
  return ctx;
}
