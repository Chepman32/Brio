/**
 * AI Dashboard Component
 * Shows AI insights, suggestions, and analytics
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { TaskType } from '../types';
import { useAI } from '../hooks/useAI';

interface AIDashboardProps {
  tasks: TaskType[];
  onTaskPress?: (task: TaskType) => void;
  onCreateTask?: (title: string) => void;
  onMergeTasks?: (task1: TaskType, task2: TaskType) => void;
}

export const AIDashboard: React.FC<AIDashboardProps> = ({
  tasks,
  onTaskPress,
  onCreateTask,
  onMergeTasks,
}) => {
  const { dashboard, loading, refreshDashboard } = useAI(tasks);

  if (loading || !dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Анализирую данные...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Day Vibe */}
      <View
        style={[
          styles.vibeCard,
          {
            background: `linear-gradient(135deg, ${dashboard.dayVibe.gradientColors[0]}, ${dashboard.dayVibe.gradientColors[1]})`,
          },
        ]}
      >
        <Text style={styles.vibeEmoji}>{dashboard.dayVibe.emoji}</Text>
        <Text style={styles.vibeLabel}>{dashboard.dayVibe.label}</Text>
        <Text style={styles.vibeScore}>
          Нагрузка: {dashboard.dayVibe.zScore > 0 ? '+' : ''}
          {dashboard.dayVibe.zScore.toFixed(1)}σ
        </Text>
      </View>

      {/* Top Priorities */}
      {dashboard.topPriorities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Топ приоритеты</Text>
          {dashboard.topPriorities.map((task: TaskType) => (
            <TouchableOpacity
              key={task._id}
              style={styles.taskCard}
              onPress={() => onTaskPress?.(task)}
            >
              <Text style={styles.taskTitle}>{task.title}</Text>
              {task.category && (
                <Text style={styles.taskCategory}>{task.category}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recurring Reminders */}
      {dashboard.recurringReminders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Напоминания о привычках</Text>
          {dashboard.recurringReminders.map((reminder: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionCard}
              onPress={() =>
                onCreateTask?.(reminder.pattern.key.split('::')[0])
              }
            >
              <Text style={styles.suggestionText}>{reminder.suggestion}</Text>
              <Text style={styles.suggestionAction}>Создать задачу →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Chain Suggestions */}
      {dashboard.chainSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⛓️ Связанные задачи</Text>
          {dashboard.chainSuggestions.map((chain: any, index: number) => (
            <View key={index} style={styles.chainCard}>
              <Text style={styles.chainAnchor}>После "{chain.anchor}"</Text>
              <Text style={styles.chainLabel}>обычно следует:</Text>
              {chain.suggestions.map((suggestion: string, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={styles.chainSuggestion}
                  onPress={() => onCreateTask?.(suggestion)}
                >
                  <Text style={styles.chainSuggestionText}>• {suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Duplicates */}
      {dashboard.duplicates.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Возможные дубликаты</Text>
          {dashboard.duplicates.map((dup: any, index: number) => (
            <View key={index} style={styles.duplicateCard}>
              <Text style={styles.duplicateTitle}>
                Похожесть: {(dup.similarity * 100).toFixed(0)}%
              </Text>
              <Text style={styles.duplicateTask}>1. {dup.task1.title}</Text>
              <Text style={styles.duplicateTask}>2. {dup.task2.title}</Text>
              <TouchableOpacity
                style={styles.mergeButton}
                onPress={() => onMergeTasks?.(dup.task1, dup.task2)}
              >
                <Text style={styles.mergeButtonText}>Объединить</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Achievements */}
      {dashboard.achievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Достижения</Text>
          {dashboard.achievements.slice(0, 3).map((achievement: any) => (
            <View key={achievement._id} style={styles.achievementCard}>
              <Text style={styles.achievementIcon}>{achievement.iconName}</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDesc}>
                  {achievement.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={refreshDashboard}>
        <Text style={styles.refreshButtonText}>🔄 Обновить анализ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  vibeCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  vibeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  vibeLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  vibeScore: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  taskCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  suggestionCard: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  suggestionText: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 8,
  },
  suggestionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  chainCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chainAnchor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  chainLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  chainSuggestion: {
    paddingVertical: 6,
  },
  chainSuggestionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  duplicateCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  duplicateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  duplicateTask: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 4,
  },
  mergeButton: {
    marginTop: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mergeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 14,
    color: '#6B7280',
  },
  refreshButton: {
    margin: 16,
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
