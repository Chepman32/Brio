import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getSettings,
  setTheme,
  setNotificationsEnabled,
  setDefaultReminderTime,
  setTimeFormat,
} from '../database/operations';
import { closeRealm } from '../database/realm';
import { RecurringPatternsView } from '../components/RecurringPatternsView';
import { useResponsive } from '../hooks/useResponsive';
import { getContentContainerStyle } from '../utils/responsiveDimensions';

export const SettingsScreen: React.FC = () => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [reminderTime, setReminderTime] = useState(15);
  const [timeFormat, setTimeFormatState] = useState<'auto' | '12h' | '24h'>(
    'auto',
  );
  const [showPatternsModal, setShowPatternsModal] = useState(false);
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const contentContainerStyle = getContentContainerStyle();

  const loadSettings = React.useCallback(() => {
    try {
      const settings = getSettings();
      setThemeState(settings.theme);
      setNotificationsEnabledState(settings.notificationsEnabled);
      setReminderTime(settings.defaultReminderTime);
      setTimeFormatState(settings.timeFormat || 'auto');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setThemeState(newTheme);
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    setNotificationsEnabledState(value);
  };

  const handleReminderTimeChange = (minutes: number) => {
    setDefaultReminderTime(minutes);
    setReminderTime(minutes);
  };

  const handleTimeFormatChange = (format: 'auto' | '12h' | '24h') => {
    setTimeFormat(format);
    setTimeFormatState(format);
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'Are you sure you want to delete all tasks, achievements, and statistics? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            try {
              closeRealm();
              Alert.alert(
                'Success',
                'All data has been reset. Please restart the app.',
              );
            } catch (error) {
              console.error('Error resetting data:', error);
              Alert.alert('Error', 'Failed to reset data');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            paddingHorizontal: isTablet ? 32 : 20,
          },
        ]}
      >
        <View style={contentContainerStyle}>
          <Text style={[styles.title, { fontSize: isTablet ? 34 : 28 }]}>
            Settings
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Use dark theme throughout the app
              </Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={handleThemeToggle}
              trackColor={{ false: '#E0E0E0', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Time Format</Text>
              <Text style={styles.settingDescription}>
                Choose how times are displayed
              </Text>
            </View>
          </View>

          <View style={styles.reminderOptions}>
            {[
              { value: 'auto', label: 'Auto' },
              { value: '12h', label: '12h' },
              { value: '24h', label: '24h' },
            ].map(option => (
              <Pressable
                key={option.value}
                style={[
                  styles.reminderOption,
                  timeFormat === option.value && styles.reminderOptionActive,
                ]}
                onPress={() =>
                  handleTimeFormatChange(option.value as 'auto' | '12h' | '24h')
                }
              >
                <Text
                  style={[
                    styles.reminderOptionText,
                    timeFormat === option.value &&
                      styles.reminderOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive reminders for your tasks
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: '#E0E0E0', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Default Reminder Time</Text>
              <Text style={styles.settingDescription}>
                Minutes before task due time
              </Text>
            </View>
          </View>

          <View style={styles.reminderOptions}>
            {[5, 15, 30, 60].map(minutes => (
              <Pressable
                key={minutes}
                style={[
                  styles.reminderOption,
                  reminderTime === minutes && styles.reminderOptionActive,
                ]}
                onPress={() => handleReminderTimeChange(minutes)}
              >
                <Text
                  style={[
                    styles.reminderOptionText,
                    reminderTime === minutes && styles.reminderOptionTextActive,
                  ]}
                >
                  {minutes} min
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Smart Planning Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Planning</Text>

          <Pressable
            style={styles.settingRow}
            onPress={() => setShowPatternsModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                🔄 Recurring Task Patterns
              </Text>
              <Text style={styles.settingDescription}>
                View and manage learned patterns
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>🤖 AI-Powered Suggestions</Text>
            <Text style={styles.infoCardText}>
              Brio learns from your task creation patterns and suggests tasks
              you typically add at specific times. For example, if you add "Go
              gym" every Monday at 17:00, Brio will remind you to add it if you
              forget!
            </Text>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          <Pressable style={styles.dangerButton} onPress={handleResetData}>
            <Text style={styles.dangerButtonText}>Reset All Data</Text>
          </Pressable>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Brio</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              Smart Offline Reminder & Planning App
            </Text>
            <Text style={styles.aboutFeatures}>
              ✨ Gesture-driven interface{'\n'}
              🤖 AI-powered scheduling{'\n'}
              🏆 Achievement system{'\n'}
              📱 100% offline functionality
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Recurring Patterns Modal */}
      <Modal
        visible={showPatternsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <RecurringPatternsView onClose={() => setShowPatternsModal(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  reminderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  reminderOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#F0F4FF',
  },
  reminderOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  reminderOptionTextActive: {
    color: '#6366F1',
  },
  infoCard: {
    backgroundColor: '#F0F4FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: '#FFE5E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4444',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  aboutDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  aboutFeatures: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
    textAlign: 'left',
  },
  chevron: {
    fontSize: 24,
    color: '#999',
    fontWeight: '300',
  },
  bottomSpacer: {
    height: 40,
  },
});
