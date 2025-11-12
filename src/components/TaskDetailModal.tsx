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

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  visible,
  task,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { formatTime } = useTimeFormat();

  if (!task) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeLocal = (date?: Date) => {
    if (!date) return 'No time set';
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Task Details</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.title}>{task.title}</Text>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor() },
                ]}
              >
                <Text style={styles.priorityText}>
                  {task.priority.toUpperCase()}
                </Text>
              </View>
            </View>

            {task.notes && (
              <View style={styles.section}>
                <Text style={styles.label}>Notes</Text>
                <Text style={styles.value}>{task.notes}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>Due Date</Text>
              <Text style={styles.value}>{formatDate(task.dueDate)}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Due Time</Text>
              <Text style={styles.value}>{formatTimeLocal(task.dueTime)}</Text>
            </View>

            {task.category && (
              <View style={styles.section}>
                <Text style={styles.label}>Category</Text>
                <Text style={styles.value}>{task.category}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>Created</Text>
              <Text style={styles.value}>{formatDate(task.createdAt)}</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.button, styles.deleteButton]}
              onPress={() => {
                onDelete(task._id);
                onClose();
              }}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.editButton]}
              onPress={() => {
                onEdit(task);
                onClose();
              }}
            >
              <Text style={styles.editButtonText}>Edit</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
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
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
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
    color: '#333',
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
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4444',
  },
  editButton: {
    backgroundColor: '#6366F1',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
