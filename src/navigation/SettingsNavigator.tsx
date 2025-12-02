import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

const Stack = createStackNavigator<SettingsStackParamList>();

export const SettingsNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{
          headerShown: true,
          headerTitle: t('history.title'),
          headerBackTitleVisible: false,
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
        }}
      />
    </Stack.Navigator>
  );
};
