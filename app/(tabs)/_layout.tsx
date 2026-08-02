import { Tabs } from 'expo-router';

import { StyleSheet, View } from 'react-native';

import { BottomNav } from '../../src/components/BottomNav';

import { colors } from '../../src/constants/theme';



export default function TabsLayout() {

  return (

    <View style={styles.shell}>

      <View style={styles.content}>

        <Tabs

          tabBar={() => null}

          screenOptions={{

            headerStyle: { backgroundColor: colors.background },

            headerTintColor: colors.text,

            headerTitleStyle: { fontWeight: '800' },

          }}

        >

          <Tabs.Screen name="index" options={{ title: 'Catalog', headerShown: false }} />

          <Tabs.Screen name="packs" options={{ title: 'Packs', headerShown: false }} />

          <Tabs.Screen name="collection" options={{ title: 'Collection', headerShown: false }} />

          <Tabs.Screen name="sets" options={{ title: 'Sets', headerShown: false }} />

          <Tabs.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />

        </Tabs>

      </View>

      <BottomNav />

    </View>

  );

}



const styles = StyleSheet.create({

  shell: {

    flex: 1,

    flexDirection: 'column',

    backgroundColor: colors.background,

  },

  content: {

    flex: 1,

    minWidth: 0,

  },

});


