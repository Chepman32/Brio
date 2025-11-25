/**
 * Recurring Patterns View Component
 * Displays learned patterns and allows users to manage them
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RecurringSuggestionService } from '../services/RecurringSuggestionService';
import { PatternModel } from '../database/schemas/PatternModel';
import { PatternStats } from '../types/recurring-suggestion.types';
import { getDayName } from '../utils/textNormalization';
import { binToTimeString } from '../utils/dateHelpers.recurring';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

interface RecurringPatternsViewProps {
  onClose?: () => void;
}

export const RecurringPatternsView: React.FC<RecurringPatternsViewProps> = ({
  onClose,
}) => {
  const { colors } = useTheme();
  const { t } = useLocalization();
  const [patterns, setPatterns] = useState<PatternModel[]>([]);
  const [stats, setStats] = useState<PatternStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      const allPatterns = await RecurringSuggestionService.getAllPatterns();
      const patternStats = await RecurringSuggestionService.getPatternStats();

      // Sort by most recent update
      const sorted = allPatterns.sort((a, b) => b.updatedAt - a.updatedAt);

      setPatterns(sorted);
      setStats(patternStats);
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpause = async (patternKey: string) => {
    try {
      await RecurringSuggestionService.unpausePattern(patternKey);
      await loadPatterns();
    } catch (error) {
      console.error('Error unpausing pattern:', error);
    }
  };

  const handleDelete = async (patternKey: string, displayTitle: string) => {
    Alert.alert(
      t('patterns.deletePattern'),
      t('patterns.deletePatternConfirm', { title: displayTitle }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await RecurringSuggestionService.deletePattern(patternKey);
              await loadPatterns();
            } catch (error) {
              console.error('Error deleting pattern:', error);
            }
          },
        },
      ],
    );
  };

  const getCadenceBadgeColor = (cadence: string): string => {
    switch (cadence) {
      case 'weekly':
        return colors.success;
      case 'biweekly':
        return colors.primary;
      case 'monthly':
        return colors.secondary;
      default:
        return colors.textSecondary;
    }
  };

  const getCadenceLabel = (cadence: string): string => {
    switch (cadence) {
      case 'weekly':
        return t('patterns.weekly').toUpperCase();
      case 'biweekly':
        return t('patterns.biweekly');
      case 'monthly':
        return t('patterns.monthly');
      default:
        return t('patterns.irregular');
    }
  };

  const getLearnedSlot = (pattern: PatternModel): string => {
    const slot = RecurringSuggestionService.learnedCreationSlot(pattern);
    if (!slot) return t('patterns.learning');

    const dayName = getDayName(slot.dow);
    const timeStr = binToTimeString(slot.bin);
    const confidence = Math.round(slot.confidence * 100);

    return t('patterns.confidence', { day: dayName, time: timeStr, percent: confidence });
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButtonText: {
      fontSize: 24,
      color: colors.textSecondary,
    },
    loadingText: {
      textAlign: 'center',
      marginTop: 40,
      fontSize: 16,
      color: colors.textSecondary,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 16,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    patternCard: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 16,
      borderRadius: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    patternTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    patternDetail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    patternWarning: {
      fontSize: 14,
      color: colors.warning,
      marginTop: 8,
    },
    actionButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    actionButtonText: {
      color: colors.textInverse,
      fontSize: 14,
      fontWeight: '600',
    },
    deleteButton: {
      backgroundColor: colors.errorLight,
    },
    deleteButtonText: {
      color: colors.error,
    },
  });

  if (loading) {
    return (
      <View style={dynamicStyles.container}>
        <Text style={dynamicStyles.loadingText}>{t('patterns.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>{t('patterns.title')}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={dynamicStyles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {stats && (
        <View style={dynamicStyles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={dynamicStyles.statValue}>{stats.totalPatterns}</Text>
            <Text style={dynamicStyles.statLabel}>{t('patterns.total')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={dynamicStyles.statValue}>{stats.activePatterns}</Text>
            <Text style={dynamicStyles.statLabel}>{t('patterns.active')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={dynamicStyles.statValue}>{stats.weeklyPatterns}</Text>
            <Text style={dynamicStyles.statLabel}>{t('patterns.weekly')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={dynamicStyles.statValue}>{stats.pausedPatterns}</Text>
            <Text style={dynamicStyles.statLabel}>{t('patterns.paused')}</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.patternsList}>
        {patterns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={dynamicStyles.emptyStateText}>
              {t('patterns.noPatterns')}
            </Text>
          </View>
        ) : (
          patterns.map(pattern => (
            <View key={pattern.key} style={dynamicStyles.patternCard}>
              <View style={styles.patternHeader}>
                <Text style={dynamicStyles.patternTitle}>{pattern.displayTitle}</Text>
                <View
                  style={[
                    styles.cadenceBadge,
                    { backgroundColor: getCadenceBadgeColor(pattern.cadence) },
                  ]}
                >
                  <Text style={styles.cadenceBadgeText}>
                    {getCadenceLabel(pattern.cadence)}
                  </Text>
                </View>
              </View>

              <Text style={dynamicStyles.patternDetail}>
                📅 {getLearnedSlot(pattern)}
              </Text>

              <Text style={dynamicStyles.patternDetail}>
                📊 {t('patterns.occurrences', { count: pattern.occurrences.length })}
              </Text>

              {pattern.ignoredCount > 0 && (
                <Text style={dynamicStyles.patternWarning}>
                  ⚠️ {t('patterns.ignoredTimes', { count: pattern.ignoredCount })}
                </Text>
              )}

              <View style={styles.patternActions}>
                {pattern.ignoredCount >= 3 && (
                  <TouchableOpacity
                    style={dynamicStyles.actionButton}
                    onPress={() => handleUnpause(pattern.key)}
                  >
                    <Text style={dynamicStyles.actionButtonText}>{t('patterns.unpause')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[dynamicStyles.actionButton, dynamicStyles.deleteButton]}
                  onPress={() =>
                    handleDelete(pattern.key, pattern.displayTitle)
                  }
                >
                  <Text
                    style={[dynamicStyles.actionButtonText, dynamicStyles.deleteButtonText]}
                  >
                    {t('common.delete')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    padding: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  patternsList: {
    flex: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cadenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cadenceBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patternActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
});
