import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const { ThemeProvider } = require('./src/context/ThemeContext');
const { DatabaseProvider } = require('./src/context/DatabaseContext');
const AppNavigator = require('./src/navigation/AppNavigator').default;

export default function App() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </ThemeProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
