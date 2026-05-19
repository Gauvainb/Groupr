import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';
import { COLORS } from './src/constants/theme';

const NAV_THEME = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.card,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="groupr.db" onInit={initDatabase}>
        <NavigationContainer theme={NAV_THEME}>
          <AppNavigator />
        </NavigationContainer>
      </SQLiteProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
