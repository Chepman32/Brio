import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
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
}) => {
  const { formatTime } = useTimeFormat();
  const { colors } = useTheme();
  const { t, locale } = useLocalization();

  if (!task) return null;

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modalContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('task.title')}</Text>
            <Pressable onPress={onClose}>
              <Text style={[styles.closeButton, { color: colors.textSecondary }]}>✕</Text>
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
              style={[styles.button, styles.deleteButton, { backgroundColor: colors.errorLight }]}
              onPress={() => {
                onDelete(task._id);
                onClose();
              }}
            >
              <Text style={[styles.deleteButtonText, { color: colors.error }]}>{t('common.delete')}</Text>
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
        </View>
      </View>
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
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
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
  deleteButton: {},
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {},
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
