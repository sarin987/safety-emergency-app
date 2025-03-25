import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import realtimeService from './src/services/realtime';

export default function App() {
  useEffect(() => {
    // Initialize realtime service
    realtimeService.initialize().catch(console.error);

    return () => {
      // Cleanup realtime service
      realtimeService.disconnect();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
