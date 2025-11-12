import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TaskCreationModalProps, TaskInput } from '../types';
import { SmartPlanningService } from '../services/SmartPlanningService';
import { PREDEFINED_CATEGORIES } from '../utils/categories';
import { useTimeFormat } from '../hooks/useTimeFormat';

export const TaskCreationModal: React.FC<TaskCreationModalProps> = ({
  visible,
  onClose,
  onSave,
  editTask,
}) => {
  const { formatTime, is24Hour } = useTimeFormat();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTime, setDueTime] = useState<Date | undefined>(undefined);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);
  const [smartSuggestion, setSmartSuggestion] = useState<{
    suggestedTime: Date;
    confidence: number;
    reason: string;
  } | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const translateY = useSharedValue(1000);
  const scrollViewRef = useRef<ScrollView>(null);
  const dateFieldRef = useRef<View>(null);
  const timeFieldRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
      });

      if (editTask) {
        setTitle(editTask.title);
        setNotes(editTask.notes || '');
        setDueDate(editTask.dueDate);
        setDueTime(editTask.dueTime);
        setCategory(editTask.category || '');
        setPriority(editTask.priority);
      }
    } else {
      translateY.value = withSpring(1000, {
        damping: 30,
        stiffness: 300,
      });
      // Reset form
      setTitle('');
      setNotes('');
      setDueDate(new Date());
      setDueTime(undefined);
      setCategory('');
      setPriority('medium');
      setShowSmartSuggestions(false);
      setSmartSuggestion(null);
      setShowCategoryPicker(false);
      setFilteredCategories([]);
    }
  }, [visible, editTask]);

  // Filter categories based on input
  useEffect(() => {
    if (category.trim()) {
      const filtered = PREDEFINED_CATEGORIES.filter(cat =>
        cat.toLowerCase().includes(category.toLowerCase()),
      );
      setFilteredCategories(filtered);
    } else if (showCategoryPicker) {
      // Show all categories when input is empty but picker is open
      setFilteredCategories([...PREDEFINED_CATEGORIES]);
    } else {
      setFilteredCategories([]);
    }
  }, [category, showCategoryPicker]);

  // Generate smart suggestion when priority changes
  useEffect(() => {
    if (visible && !editTask && title.trim()) {
      generateSmartSuggestion();
    }
  }, [priority, title]);

  const generateSmartSuggestion = () => {
    try {
      const taskInput: TaskInput = {
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueDate,
        dueTime,
        category: category.trim() || undefined,
        priority,
      };

      const suggestions = SmartPlanningService.getSmartSuggestions(taskInput);
      setSmartSuggestion({
        suggestedTime: suggestions.suggestedTime,
        confidence: suggestions.confidence,
        reason: suggestions.reason,
      });
      setShowSmartSuggestions(true);
    } catch (error) {
      console.error('Error generating smart suggestion:', error);
    }
  };

  const applySuggestion = () => {
    if (smartSuggestion) {
      setDueDate(smartSuggestion.suggestedTime);
      setDueTime(smartSuggestion.suggestedTime);
      setShowSmartSuggestions(false);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Auto-scroll when date picker opens
  useEffect(() => {
    if (showDatePicker && dateFieldRef.current && scrollViewRef.current) {
      setTimeout(() => {
        dateFieldRef.current?.measureLayout(
          scrollViewRef.current as any,
          (_x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {},
        );
      }, 100);
    }
  }, [showDatePicker]);

  // Auto-scroll when time picker opens
  useEffect(() => {
    if (showTimePicker && timeFieldRef.current && scrollViewRef.current) {
      setTimeout(() => {
        timeFieldRef.current?.measureLayout(
          scrollViewRef.current as any,
          (_x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {},
        );
      }, 100);
    }
  }, [showTimePicker]);

  const handleSave = () => {
    if (!title.trim()) {
      return; // Title is required
    }

    const taskInput: TaskInput = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      dueDate,
      dueTime,
      category: category.trim() || undefined,
      priority,
    };

    onSave(taskInput);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editTask ? 'Edit Task' : 'New Task'}
            </Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.scrollContainer}
            onPress={() => {
              if (showCategoryPicker) {
                setShowCategoryPicker(false);
              }
            }}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter task title"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes (optional)"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g., Work, Personal"
                  placeholderTextColor="#999"
                  onFocus={() => {
                    setFilteredCategories([...PREDEFINED_CATEGORIES]);
                    setShowCategoryPicker(true);
                  }}
                />

                {showCategoryPicker && filteredCategories.length > 0 && (
                  <View style={styles.categoryPicker}>
                    <ScrollView
                      style={styles.categoryList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {filteredCategories.map((cat, index) => (
                        <Pressable
                          key={index}
                          style={styles.categoryItem}
                          onPress={() => {
                            setCategory(cat);
                            setShowCategoryPicker(false);
                          }}
                        >
                          <Text style={styles.categoryItemText}>{cat}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityContainer}>
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <Pressable
                      key={p}
                      style={[
                        styles.priorityButton,
                        priority === p && styles.priorityButtonActive,
                        priority === p && {
                          backgroundColor: getPriorityColor(p),
                        },
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          priority === p && styles.priorityTextActive,
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Date and Time Selection */}
              <View style={styles.field} ref={dateFieldRef}>
                <Pressable
                  style={styles.accordionHeader}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <View style={styles.accordionHeaderContent}>
                    <Text style={styles.label}>Due Date</Text>
                    <Text style={styles.accordionValue}>
                      📅{' '}
                      {dueDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.accordionArrow}>
                    {showDatePicker ? '▼' : '▶'}
                  </Text>
                </Pressable>

                {/* Date Picker - Inline Accordion */}
                {showDatePicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={dueDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          setShowDatePicker(false);
                        }
                        if (selectedDate) {
                          setDueDate(selectedDate);
                          // Update dueTime date if it exists
                          if (dueTime) {
                            const newTime = new Date(selectedDate);
                            newTime.setHours(
                              dueTime.getHours(),
                              dueTime.getMinutes(),
                            );
                            setDueTime(newTime);
                          }
                        }
                      }}
                    />
                  </View>
                )}
              </View>

              <View style={styles.field} ref={timeFieldRef}>
                <Pressable
                  style={styles.accordionHeader}
                  onPress={() => {
                    if (!dueTime) {
                      const newTime = new Date(dueDate);
                      newTime.setHours(9, 0, 0, 0);
                      setDueTime(newTime);
                    }
                    setShowTimePicker(!showTimePicker);
                  }}
                >
                  <View style={styles.accordionHeaderContent}>
                    <Text style={styles.label}>Due Time (Optional)</Text>
                    <Text style={styles.accordionValue}>
                      {dueTime ? `🕐 ${formatTime(dueTime)}` : '🕐 Set time'}
                    </Text>
                  </View>
                  <View style={styles.accordionRightContent}>
                    {dueTime && (
                      <Pressable
                        style={styles.clearTimeButtonSmall}
                        onPress={e => {
                          e.stopPropagation();
                          setDueTime(undefined);
                          setShowTimePicker(false);
                        }}
                      >
                        <Text style={styles.clearTimeText}>✕</Text>
                      </Pressable>
                    )}
                    <Text style={styles.accordionArrow}>
                      {showTimePicker ? '▼' : '▶'}
                    </Text>
                  </View>
                </Pressable>

                {/* Time Picker - Inline Accordion */}
                {showTimePicker && dueTime && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={dueTime}
                      mode="time"
                      is24Hour={is24Hour}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedTime) => {
                        if (Platform.OS === 'android') {
                          setShowTimePicker(false);
                        }
                        if (selectedTime) {
                          setDueTime(selectedTime);
                        }
                      }}
                    />
                  </View>
                )}
              </View>

              {/* Smart Suggestions */}
              {showSmartSuggestions && smartSuggestion && !editTask && (
                <View style={styles.suggestionCard}>
                  <View style={styles.suggestionHeader}>
                    <Text style={styles.suggestionTitle}>
                      🤖 Smart Suggestion
                    </Text>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(smartSuggestion.confidence * 100)}% match
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.suggestionReason}>
                    {smartSuggestion.reason}
                  </Text>
                  <Text style={styles.suggestionTime}>
                    {smartSuggestion.suggestedTime.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at {formatTime(smartSuggestion.suggestedTime)}
                  </Text>
                  <Pressable
                    style={styles.applySuggestionButton}
                    onPress={applySuggestion}
                  >
                    <Text style={styles.applySuggestionText}>
                      Apply Suggestion
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </Pressable>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveButton,
                !title.trim() && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
  switch (priority) {
    case 'high':
      return '#FF4444';
    case 'medium':
      return '#FFA500';
    case 'low':
      return '#4CAF50';
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
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
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  priorityButtonActive: {
    borderColor: 'transparent',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  priorityTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestionCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  confidenceBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  suggestionReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  suggestionTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  applySuggestionButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applySuggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryPicker: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryItemText: {
    fontSize: 15,
    color: '#333',
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FAFAFA',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  clearTimeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearTimeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearTimeButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FAFAFA',
  },
  accordionHeaderContent: {
    flex: 1,
  },
  accordionValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginTop: 4,
  },
  accordionArrow: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  accordionRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerDoneButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
