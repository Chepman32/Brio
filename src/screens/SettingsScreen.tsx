import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getSettings,
  setNotificationsEnabled,
  setDefaultReminderTime,
  setTimeFormat,
  setSoundEnabled,
  setHapticsEnabled,
} from '../database/operations';
import { closeRealm } from '../database/realm';
import { RecurringPatternsView } from '../components/RecurringPatternsView';
import { useResponsive } from '../hooks/useResponsive';
import { getContentContainerStyle } from '../utils/responsiveDimensions';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { ThemeType, LocaleType } from '../database/schemas/Settings';
import { SettingsStackParamList } from '../types';

export const SettingsScreen: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<SettingsStackParamList, 'SettingsHome'>>();
  const { colors, themeName, setTheme } = useTheme();
  const { locale, setLocale, t, languageNames, languageFlags, languageSortNames } = useLocalization();
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [reminderTime, setReminderTime] = useState(15);
  const [timeFormat, setTimeFormatState] = useState<'auto' | '12h' | '24h'>('auto');
  const [showPatternsModal, setShowPatternsModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const languageListRef = useRef<FlatList<any>>(null);
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const contentContainerStyle = getContentContainerStyle();

  const loadSettings = React.useCallback(() => {
    try {
      const settings = getSettings();
      setNotificationsEnabledState(settings.notificationsEnabled);
      setSoundEnabledState(settings.soundEnabled ?? true);
      setHapticsEnabledState(settings.hapticsEnabled ?? true);
      setReminderTime(settings.defaultReminderTime);
      setTimeFormatState(settings.timeFormat || 'auto');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    setShowThemeModal(false);
  };

  const handleLanguageChange = (newLocale: LocaleType) => {
    setLocale(newLocale);
    setShowLanguageModal(false);
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    setNotificationsEnabledState(value);
  };

  const handleSoundToggle = (value: boolean) => {
    setSoundEnabled(value);
    setSoundEnabledState(value);
  };

  const handleHapticsToggle = (value: boolean) => {
    setHapticsEnabled(value);
    setHapticsEnabledState(value);
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
      t('settings.clearData'),
      t('settings.clearDataConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            try {
              closeRealm();
              Alert.alert(t('common.success'), t('settings.clearDataSuccess'));
            } catch (error) {
              console.error('Error resetting data:', error);
              Alert.alert(t('common.error'), t('settings.clearDataError'));
            }
          },
        },
      ],
    );
  };

  const themeOptions: { value: ThemeType; label: string }[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'solar', label: t('settings.themeSolar') },
    { value: 'mono', label: t('settings.themeMono') },
  ];

  const getThemeLabel = (theme: ThemeType): string => {
    return themeOptions.find(opt => opt.value === theme)?.label || theme;
  };

  const languageList = React.useMemo(
    () =>
      (Object.keys(languageNames) as LocaleType[]).reduce<
        { locale: LocaleType; label: string; sortKey: string }[]
      >((acc, localeKey) => {
        acc.push({
          locale: localeKey,
          label: languageNames[localeKey],
          sortKey: languageSortNames[localeKey] || languageNames[localeKey],
        });
        return acc;
      }, []),
    [languageNames, languageSortNames],
  );

  const sortedLanguageList = React.useMemo(() => {
    const enItem = languageList.find(item => item.locale === 'en');
    const others = languageList
      .filter(item => item.locale !== 'en')
      .sort((a, b) =>
        a.sortKey.localeCompare(b.sortKey, 'en', { sensitivity: 'base' }),
      );
    return enItem ? [enItem, ...others] : others;
  }, [languageList]);

  React.useEffect(() => {
    if (showLanguageModal) {
      const index = sortedLanguageList.findIndex(item => item.locale === locale);
      if (index > -1) {
        setTimeout(() => {
          try {
            languageListRef.current?.scrollToIndex({
              index,
              animated: true,
            });
          } catch (err) {
            console.error('Failed to scroll to current language:', err);
          }
        }, 50);
      }
    }
  }, [locale, showLanguageModal, sortedLanguageList]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    title: {
      fontWeight: 'bold',
      color: colors.text,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    settingValue: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    reminderOption: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    reminderOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight + '20',
    },
    reminderOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    reminderOptionTextActive: {
      color: colors.primary,
    },
    infoCard: {
      backgroundColor: colors.primaryLight + '20',
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    infoCardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 8,
    },
    infoCardText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    dangerButton: {
      backgroundColor: colors.errorLight,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.error,
    },
    dangerButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error,
    },
    aboutCard: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    aboutTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    aboutVersion: {
      fontSize: 14,
      color: colors.textTertiary,
      marginBottom: 8,
    },
    aboutDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
      textAlign: 'center',
    },
    aboutFeatures: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 24,
      textAlign: 'left',
    },
    chevron: {
      fontSize: 24,
      color: colors.textTertiary,
      fontWeight: '300',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalSwipeIndicator: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalCloseButton: {
      padding: 8,
    },
    modalCloseText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '600',
    },
    optionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    optionText: {
      fontSize: 16,
      color: colors.text,
    },
    optionSelected: {
      backgroundColor: colors.primaryLight + '20',
    },
    checkmark: {
      fontSize: 20,
      color: colors.primary,
      fontWeight: 'bold',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View
        style={[
          dynamicStyles.header,
          {
            paddingTop: insets.top + 20,
            paddingHorizontal: isTablet ? 32 : 20,
          },
        ]}
      >
        <View style={contentContainerStyle}>
          <Text style={[dynamicStyles.title, { fontSize: isTablet ? 34 : 28 }]}>
            {t('settings.title')}
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
          <Text style={dynamicStyles.sectionTitle}>{t('settings.appearance')}</Text>

          {/* Theme Selector */}
          <Pressable style={dynamicStyles.settingRow} onPress={() => setShowThemeModal(true)}>
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>{t('settings.theme')}</Text>
              <Text style={dynamicStyles.settingDescription}>
                {getThemeLabel(themeName)}
              </Text>
            </View>
            <Text style={dynamicStyles.chevron}>›</Text>
          </Pressable>

          {/* Sound Toggle */}
          <View style={dynamicStyles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>{t('settings.sound')}</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Haptics Toggle */}
          <View style={dynamicStyles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>{t('settings.haptics')}</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={handleHapticsToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Language Selector */}
          <Pressable style={dynamicStyles.settingRow} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>{t('settings.language')}</Text>
              <View style={styles.languageRow}>
                <Image source={languageFlags[locale]} style={styles.flagIcon} />
                <Text style={dynamicStyles.settingDescription}>
                  {languageNames[locale]}
                </Text>
              </View>
            </View>
            <Text style={dynamicStyles.chevron}>›</Text>
          </Pressable>

          {/* Time Format */}
          <View style={dynamicStyles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>{t('settings.timeFormat')}</Text>
              <Text style={dynamicStyles.settingDescription}>
                {t('settings.timeFormatAuto')} / {t('settings.timeFormat12h')} / {t('settings.timeFormat24h')}
              </Text>
            </View>
          </View>

          <View style={styles.reminderOptions}>
            {[
              { value: 'auto', label: t('settings.timeFormatAuto') },
              { value: '12h', label: t('settings.timeFormat12h') },
              { value: '24h', label: t('settings.timeFormat24h') },
            ].map(option => (
              <Pressable
                key={option.value}
                style={[
                  dynamicStyles.reminderOption,
                  timeFormat === option.value && dynamicStyles.reminderOptionActive,
                ]}
                onPress={() =>
                  handleTimeFormatChange(option.value as 'auto' | '12h' | '24h')
                }
              >
                <Text
                  style={[
                    dynamicStyles.reminderOptionText,
                    timeFormat === option.value && dynamicStyles.reminderOptionTextActive,
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
          <Text style={dynamicStyles.sectionTitle}>{t('settings.notifications')}</Text>

          <View style={dynamicStyles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>{t('settings.enableNotifications')}</Text>
              <Text style={dynamicStyles.settingDescription}>
                {t('settings.reminderTime')}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={dynamicStyles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>{t('settings.reminderTime')}</Text>
            </View>
          </View>

          <View style={styles.reminderOptions}>
            {[5, 15, 30, 60].map(minutes => (
              <Pressable
                key={minutes}
                style={[
                  dynamicStyles.reminderOption,
                  reminderTime === minutes && dynamicStyles.reminderOptionActive,
                ]}
                onPress={() => handleReminderTimeChange(minutes)}
              >
                <Text
                  style={[
                    dynamicStyles.reminderOptionText,
                    reminderTime === minutes && dynamicStyles.reminderOptionTextActive,
                  ]}
                >
                  {t('settings.minutesShort', { count: minutes })}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Smart Planning Section */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>{t('settings.smartPlanning')}</Text>

          <Pressable
            style={dynamicStyles.settingRow}
            onPress={() => setShowPatternsModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>
                {t('settings.autoSchedule')}
              </Text>
            </View>
            <Text style={dynamicStyles.chevron}>›</Text>
          </Pressable>

          <View style={dynamicStyles.infoCard}>
            <Text style={dynamicStyles.infoCardTitle}>{t('settings.aiPoweredSuggestions')}</Text>
            <Text style={dynamicStyles.infoCardText}>
              {t('settings.aiPoweredDescription')}
            </Text>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>{t('settings.data')}</Text>

          <Pressable
            style={dynamicStyles.settingRow}
            onPress={() => navigation.navigate('History')}
          >
            <View style={styles.settingInfo}>
              <Text style={dynamicStyles.settingLabel}>{t('settings.history')}</Text>
              <Text style={dynamicStyles.settingDescription}>
                {t('settings.historyDescription')}
              </Text>
            </View>
            <Text style={dynamicStyles.chevron}>›</Text>
          </Pressable>

          <Pressable style={dynamicStyles.dangerButton} onPress={handleResetData}>
            <Text style={dynamicStyles.dangerButtonText}>{t('settings.clearData')}</Text>
          </Pressable>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={dynamicStyles.sectionTitle}>{t('settings.about')}</Text>

          <View style={dynamicStyles.aboutCard}>
            <Text style={dynamicStyles.aboutTitle}>Brio</Text>
            <Text style={dynamicStyles.aboutVersion}>{t('settings.version')} 1.0.0</Text>
            <Text style={dynamicStyles.aboutDescription}>
              {t('settings.appDescription')}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={[dynamicStyles.modalContainer, { paddingTop: insets.top }]}>
          <View style={dynamicStyles.modalSwipeIndicator} />
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>{t('settings.theme')}</Text>
            <Pressable
              style={dynamicStyles.modalCloseButton}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={dynamicStyles.modalCloseText}>{t('common.done')}</Text>
            </Pressable>
          </View>
          <FlatList
            data={themeOptions}
            keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  dynamicStyles.optionItem,
                  themeName === item.value && dynamicStyles.optionSelected,
                ]}
                onPress={() => handleThemeChange(item.value)}
              >
                <Text style={dynamicStyles.optionText}>{item.label}</Text>
                {themeName === item.value && (
                  <Text style={dynamicStyles.checkmark}>✓</Text>
                )}
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={[dynamicStyles.modalContainer, { paddingTop: insets.top }]}>
          <View style={dynamicStyles.modalSwipeIndicator} />
          <View style={dynamicStyles.modalHeader}>
            <Text style={dynamicStyles.modalTitle}>{t('settings.language')}</Text>
            <Pressable
              style={dynamicStyles.modalCloseButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={dynamicStyles.modalCloseText}>{t('common.done')}</Text>
            </Pressable>
          </View>
          <FlatList
            data={sortedLanguageList}
            ref={languageListRef}
            getItemLayout={(_, index) => ({
              length: 64,
              offset: 64 * index,
              index,
            })}
            onScrollToIndexFailed={info => {
              setTimeout(() => {
                languageListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true,
                });
              }, 50);
            }}
            keyExtractor={item => item.locale}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  dynamicStyles.optionItem,
                  locale === item.locale && dynamicStyles.optionSelected,
                ]}
                onPress={() => handleLanguageChange(item.locale)}
              >
                <View style={styles.languageRow}>
                  <Image source={languageFlags[item.locale]} style={styles.flagIcon} />
                  <Text style={dynamicStyles.optionText}>
                    {item.label}
                  </Text>
                </View>
                {locale === item.locale && (
                  <Text style={dynamicStyles.checkmark}>✓</Text>
                )}
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Recurring Patterns Modal */}
      <Modal
        visible={showPatternsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPatternsModal(false)}
      >
        <View style={[dynamicStyles.modalContainer, { paddingTop: insets.top }]}>
          <View style={dynamicStyles.modalSwipeIndicator} />
          <RecurringPatternsView onClose={() => setShowPatternsModal(false)} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  flagIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
