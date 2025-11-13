/**
 * Brio - Smart Offline Reminder & Planning App
 * @format
 */

import React, { useState, useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/screens/SplashScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeRealm } from './src/database/realm';
import {
  initializeAchievements,
  initializeStats,
  initializeSettings,
  getSettings,
} from './src/database/operations';
import { NotificationService } from './src/services/NotificationService';
import { useRecurringSuggestions } from './src/hooks/useRecurringSuggestions';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Initialize recurring task suggestions
  const { initialized: suggestionsInitialized, pendingSuggestions } =
    useRecurringSuggestions();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (suggestionsInitialized) {
      console.log(
        `✅ Recurring suggestions initialized with ${pendingSuggestions.length} pending suggestions`,
      );
    }
  }, [suggestionsInitialized, pendingSuggestions.length]);

  const initializeApp = async () => {
    try {
      // Initialize Realm database
      const realm = await initializeRealm();

      // Initialize default data
      initializeSettings();
      initializeStats();
      initializeAchievements();

      // Initialize notification service
      await NotificationService.initialize();

      // Initialize recurring suggestions service
      const { RecurringSuggestionService } = await import(
        './src/services/RecurringSuggestionService'
      );
      await RecurringSuggestionService.initialize(realm);
      console.log('✅ Recurring suggestions service initialized');

      // Check if onboarding is completed
      const settings = getSettings();
      setShowOnboarding(!settings.onboardingCompleted);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsLoading(false);
    }
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (isLoading) {
    return null; // Or a loading indicator
  }

  if (showSplash) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <SplashScreen onComplete={handleSplashComplete} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (showOnboarding) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
