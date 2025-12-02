import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  getCompletedTasks,
  markTaskIncomplete,
  deleteTask,
  completePastDueTasks,
} from '../database/operations';
import { TaskType } from '../types';
import { useResponsive } from '../hooks/useResponsive';
import { getContentContainerStyle } from '../utils/responsiveDimensions';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { translateCategory } from '../utils/categories';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { NotificationService } from '../services/NotificationService';
import { SmartPlanningService } from '../services/SmartPlanningService';
import { AchievementService } from '../services/AchievementService';

export const HistoryScreen: React.FC = () => {
  const [completedTasks, setCompletedTasks] = useState<TaskType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const { isTablet } = useResponsive();
  const { colors } = useTheme();
  const { t, locale } = useLocalization();
  const { formatTime } = useTimeFormat();
  const contentContainerStyle = getContentContainerStyle();

  const autoCompletePastDue = useCallback(async () => {
    try {
      const autoCompleted = completePastDueTasks();
      for (const task of autoCompleted) {
        await NotificationService.cancelNotification(task._id);
        SmartPlanningService.updateUserStats(task);
      }
      if (autoCompleted.length > 0) {
        AchievementService.checkAchievements();
      }
    } catch (error) {
      console.error('Error auto-completing past due tasks (history):', error);
    }
  }, []);

  const loadCompletedTasks = useCallback(async () => {
    try {
      await autoCompletePastDue();
      const tasks = getCompletedTasks().map(task => ({
        _id: task._id,
        title: task.title,
        notes: task.notes,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        category: task.category,
        priority: task.priority,
        icon: (task as any).icon,
        recurring: (task as any).recurring,
        recurringFrequency: (task as any).recurringFrequency as
          | 'daily'
          | 'weekly'
          | 'monthly'
          | undefined,
        completed: task.completed,
        completedAt: task.completedAt,
        snoozedUntil: task.snoozedUntil,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));
      setCompletedTasks(tasks);
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    }
  }, [autoCompletePastDue]);

  useEffect(() => {
    loadCompletedTasks();
  }, [loadCompletedTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompletedTasks();
    setRefreshing(false);
  };

  const formatCompletedAt = useCallback(
    (date?: Date) => {
      if (!date) {
        return t('history.completedFallback');
      }

      const datePart = date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return `${datePart} • ${formatTime(date)}`;
    },
    [formatTime, locale, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: TaskType }) => (
      <Pressable
        style={[
          styles.taskCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
        onPress={() => {
          setSelectedTask(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.taskHeader}>
          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon
                name={item.icon || 'checkmark-done-outline'}
                size={20}
                color={colors.text}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {item.title}
            </Text>
          </View>
          <Text style={[styles.completedAt, { color: colors.textSecondary }]}>
            {formatCompletedAt(item.completedAt)}
          </Text>
        </View>
        {item.notes ? (
          <Text style={[styles.notes, { color: colors.textSecondary }]}>
            {item.notes}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {item.category ? (
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                {translateCategory(item.category, t)}
              </Text>
            </View>
          ) : null}
          {item.priority ? (
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                {t(`task.priority${item.priority.charAt(0).toUpperCase()}${item.priority.slice(1)}`)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    ),
    [colors.border, colors.shadow, colors.success, colors.surface, colors.surfaceSecondary, colors.text, colors.textSecondary, formatCompletedAt, t],
  );

  const emptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
          <Icon name="time-outline" size={26} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t('history.emptyTitle')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {t('history.emptySubtitle')}
        </Text>
      </View>
    ),
    [colors.surfaceSecondary, colors.text, colors.textSecondary, t],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={completedTasks}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          contentContainerStyle,
          { paddingHorizontal: isTablet ? 0 : 0 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={emptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        style={{ paddingHorizontal: isTablet ? 32 : 20 }}
      />
      <TaskDetailModal
        visible={showDetailModal}
        task={selectedTask}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTask(null);
        }}
        onEdit={() => {
          setShowDetailModal(false);
        }}
        onDelete={taskId => {
          try {
            deleteTask(taskId);
            loadCompletedTasks();
            setShowDetailModal(false);
          } catch (error) {
            console.error('Error deleting task:', error);
          }
        }}
        onComplete={taskId => {
          try {
            markTaskIncomplete(taskId);
            loadCompletedTasks();
            setShowDetailModal(false);
          } catch (error) {
            console.error('Error recovering task:', error);
          }
        }}
        completeLabel={t('common.recover')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  taskCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  completedAt: {
    fontSize: 12,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
