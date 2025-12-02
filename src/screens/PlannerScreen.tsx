import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarView } from '../components/CalendarView';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { TaskCreationModal } from '../components/TaskCreationModal';
import { getTasks, createTask } from '../database/operations';
import { TaskType, TaskInput } from '../types';
import { useResponsive } from '../hooks/useResponsive';
import { getContentContainerStyle } from '../utils/responsiveDimensions';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

export const PlannerScreen: React.FC = () => {
  const [mode, setMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const contentContainerStyle = getContentContainerStyle();
  const { colors } = useTheme();
  const { t } = useLocalization();

  const loadTasks = React.useCallback(() => {
    try {
      const allTasks = getTasks();
      setTasks(Array.from(allTasks));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, [loadTasks]),
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleModeChange = (newMode: 'day' | 'week' | 'month') => {
    setMode(newMode);
  };

  const handleAddTask = () => {
    setShowTaskModal(true);
  };

  const handleSaveTask = (taskInput: TaskInput) => {
    try {
      createTask(taskInput);
      loadTasks();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            paddingHorizontal: isTablet ? 32 : 20,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={contentContainerStyle}>
          <Text style={[styles.title, { fontSize: isTablet ? 34 : 28, color: colors.text }]}>
            {t('planner.title')}
          </Text>
          <View style={styles.modeSelector}>
            {(['day', 'week', 'month'] as const).map(m => (
              <Pressable
                key={m}
                style={[
                  styles.modeButton,
                  { backgroundColor: colors.surfaceSecondary },
                  mode === m && { backgroundColor: colors.primary },
                  { paddingHorizontal: isTablet ? 20 : 16 },
                ]}
                onPress={() => setMode(m)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: colors.textSecondary },
                    mode === m && styles.modeButtonTextActive,
                    { fontSize: isTablet ? 16 : 14 },
                  ]}
                >
                  {t(`planner.${m}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={[contentContainerStyle, { flex: 1 }]}>
        <CalendarView
          mode={mode}
          selectedDate={selectedDate}
          tasks={tasks}
          onDateSelect={handleDateSelect}
          onModeChange={handleModeChange}
          onCreateTask={handleAddTask}
        />
      </View>

      <FloatingActionButton onPress={handleAddTask} />

      <TaskCreationModal
        visible={showTaskModal}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        defaultDate={selectedDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
});
