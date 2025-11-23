import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { TodayScreen } from '../screens/TodayScreen';
import { PlannerScreen } from '../screens/PlannerScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MainTabParamList } from '../types';
import { useResponsive } from '../hooks/useResponsive';
import { ResponsiveSizes } from '../utils/responsiveDimensions';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const AppNavigator: React.FC = () => {
  const { isTablet } = useResponsive();
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          paddingBottom: isTablet ? 24 : 20,
          paddingTop: isTablet ? 12 : 8,
          height: ResponsiveSizes.tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 12 : 10,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: t('tabs.today'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Planner"
        component={PlannerScreen}
        options={{
          tabBarLabel: t('tabs.planner'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{
          tabBarLabel: t('tabs.achievements'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
