import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CollectionProvider } from '../src/context/CollectionContext';
import { CollectionBountyProvider } from '../src/context/CollectionBountyContext';
import { PackCollectionProvider } from '../src/context/PackCollectionContext';
import { BinderProvider } from '../src/context/BinderContext';
import { ImageRegionProvider } from '../src/context/ImageRegionContext';
import { colors } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
    <CollectionProvider>
      <CollectionBountyProvider>
      <PackCollectionProvider>
      <BinderProvider>
      <ImageRegionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="card/[id]"
          options={{ title: 'Card details', presentation: 'modal' }}
        />
      </Stack>
      </ImageRegionProvider>
      </BinderProvider>
      </PackCollectionProvider>
      </CollectionBountyProvider>
    </CollectionProvider>
    </SafeAreaProvider>
  );
}
