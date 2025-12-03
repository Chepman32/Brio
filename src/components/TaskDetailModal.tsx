import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TaskDetailModalProps } from '../types';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { translateCategory } from '../utils/categories';

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  visible,
  task,
  onClose,
  onEdit,
  onDelete,
  onComplete,
  completeLabel,
}) => {
  const { formatTime } = useTimeFormat();
  const { colors } = useTheme();
  const { t, locale } = useLocalization();
  const [renderModal, setRenderModal] = React.useState(visible);
  const overlayOpacity = useSharedValue(0);
  const contentTranslate = useSharedValue(20);
  const contentOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (!task) {
      setRenderModal(false);
      return;
    }
    if (visible) {
      setRenderModal(true);
      overlayOpacity.value = withTiming(1, { duration: 180 });
      contentTranslate.value = withSpring(0, { damping: 18, stiffness: 220 });
      contentOpacity.value = withTiming(1, { duration: 200 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 160 }, finished => {
        if (finished) {
          runOnJS(setRenderModal)(false);
        }
      });
      contentTranslate.value = withTiming(20, { duration: 160 });
      contentOpacity.value = withTiming(0, { duration: 160 });
    }
  }, [visible, task, overlayOpacity, contentTranslate, contentOpacity]);

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const formatTimeLocal = (date?: Date) => {
    if (!date) return t('task.noTimeSet');
    return formatTime(date);
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return '#FF4444';
      case 'medium':
        return '#FFA500';
      case 'low':
        return '#4CAF50';
    }
  };

  const getPriorityLabel = () => {
    switch (task.priority) {
      case 'high':
        return t('task.priorityHigh');
      case 'medium':
        return t('task.priorityMedium');
      case 'low':
      default:
        return t('task.priorityLow');
    }
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslate.value }],
    opacity: contentOpacity.value,
  }));

  if (!task) {
    return null;
  }

  if (!renderModal) {
    return null;
  }

  return (
    <Modal
      visible={renderModal}
      transparent
      // Keep native fade while we run custom overlay/content animations for smoother UX
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { backgroundColor: colors.overlay }, overlayStyle]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.modalContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow }, containerStyle]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View />
            <Pressable
              onPress={() => {
                onDelete(task._id);
                onClose();
              }}
              hitSlop={8}
            >
              <Text style={[styles.deleteIconLabel, { color: colors.error }]}>
                {t('common.delete')}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor() },
                ]}
              >
                <Text style={styles.priorityText}>
                  {getPriorityLabel().toUpperCase()}
                </Text>
              </View>
            </View>

            {task.notes && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('task.notes')}</Text>
                <Text style={[styles.value, { color: colors.text }]}>{task.notes}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('task.dueDate')}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{formatDate(task.dueDate)}</Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('task.dueTime')}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{formatTimeLocal(task.dueTime)}</Text>
            </View>

            {task.category && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('task.category')}</Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {translateCategory(task.category, t)}
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('task.created')}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{formatDate(task.createdAt)}</Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.button, styles.completeButton, { backgroundColor: colors.success }]}
              onPress={() => {
                onComplete(task._id);
                onClose();
              }}
            >
              <Text style={styles.completeButtonText}>
                {completeLabel || t('common.complete')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                onEdit(task);
                onClose();
              }}
            >
              <Text style={styles.editButtonText}>{t('common.edit')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '94%',
    maxHeight: '90%',
    borderRadius: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  deleteIconLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButton: {},
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {},
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
