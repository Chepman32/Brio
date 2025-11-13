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

interface RecurringPatternsViewProps {
  onClose?: () => void;
}

export const RecurringPatternsView: React.FC<RecurringPatternsViewProps> = ({
  onClose,
}) => {
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
      'Delete Pattern',
      `Are you sure you want to delete the pattern for "${displayTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
        return '#4CAF50';
      case 'biweekly':
        return '#2196F3';
      case 'monthly':
        return '#9C27B0';
      default:
        return '#757575';
    }
  };

  const getLearnedSlot = (pattern: PatternModel): string => {
    const slot = RecurringSuggestionService.learnedCreationSlot(pattern);
    if (!slot) return 'Learning...';

    const dayName = getDayName(slot.dow);
    const timeStr = binToTimeString(slot.bin);
    const confidence = Math.round(slot.confidence * 100);

    return `${dayName} at ${timeStr} (${confidence}% confidence)`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading patterns...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recurring Patterns</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalPatterns}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activePatterns}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.weeklyPatterns}</Text>
            <Text style={styles.statLabel}>Weekly</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pausedPatterns}</Text>
            <Text style={styles.statLabel}>Paused</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.patternsList}>
        {patterns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No patterns learned yet. Keep adding tasks and patterns will be
              detected automatically!
            </Text>
          </View>
        ) : (
          patterns.map(pattern => (
            <View key={pattern.key} style={styles.patternCard}>
              <View style={styles.patternHeader}>
                <Text style={styles.patternTitle}>{pattern.displayTitle}</Text>
                <View
                  style={[
                    styles.cadenceBadge,
                    { backgroundColor: getCadenceBadgeColor(pattern.cadence) },
                  ]}
                >
                  <Text style={styles.cadenceBadgeText}>
                    {pattern.cadence.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.patternDetail}>
                📅 {getLearnedSlot(pattern)}
              </Text>

              <Text style={styles.patternDetail}>
                📊 {pattern.occurrences.length} occurrences
              </Text>

              {pattern.ignoredCount > 0 && (
                <Text style={styles.patternWarning}>
                  ⚠️ Ignored {pattern.ignoredCount} time(s)
                </Text>
              )}

              <View style={styles.patternActions}>
                {pattern.ignoredCount >= 3 && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleUnpause(pattern.key)}
                  >
                    <Text style={styles.actionButtonText}>Unpause</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() =>
                    handleDelete(pattern.key, pattern.displayTitle)
                  }
                >
                  <Text
                    style={[styles.actionButtonText, styles.deleteButtonText]}
                  >
                    Delete
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  patternsList: {
    flex: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  patternCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patternTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
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
  patternDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  patternWarning: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 8,
  },
  patternActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    color: '#F44336',
  },
});
