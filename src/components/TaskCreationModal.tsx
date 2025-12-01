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
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { TaskCreationModalProps, TaskInput } from '../types';
import { SmartPlanningService } from '../services/SmartPlanningService';
import { PREDEFINED_CATEGORIES, translateCategory } from '../utils/categories';
import { useTimeFormat } from '../hooks/useTimeFormat';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';

export const TaskCreationModal: React.FC<TaskCreationModalProps> = ({
  visible,
  onClose,
  onSave,
  editTask,
  defaultDate,
}) => {
  const { formatTime, is24Hour } = useTimeFormat();
  const { colors } = useTheme();
  const { t, locale } = useLocalization();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTime, setDueTime] = useState<Date | undefined>(undefined);
  const [category, setCategory] = useState('');
  const [categoryDisplay, setCategoryDisplay] = useState('');
  const [priority, setPriority] = useState<
    'low' | 'medium' | 'high' | undefined
  >(undefined);
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
  const [scrollKey, setScrollKey] = useState(0);

  const translateY = useSharedValue(1000);
  const scrollViewRef = useRef<ScrollView>(null);
  const dateFieldRef = useRef<View>(null);
  const timeFieldRef = useRef<View>(null);

  const getPriorityLabel = (value: 'low' | 'medium' | 'high') => {
    switch (value) {
      case 'high':
        return t('task.priorityHigh');
      case 'medium':
        return t('task.priorityMedium');
      case 'low':
      default:
        return t('task.priorityLow');
    }
  };

  const formatDateWithLocale = React.useCallback(
    (date?: Date, options?: Intl.DateTimeFormatOptions) => {
      if (!date) {
        return '';
      }
      try {
        return date.toLocaleDateString(locale, options);
      } catch {
        return date.toLocaleDateString('en-US', options);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
      });

      // Force ScrollView to remount with fresh state
      setScrollKey(prev => prev + 1);

      if (editTask) {
        setTitle(editTask.title);
        setNotes(editTask.notes || '');
        setDueDate(editTask.dueDate || new Date());
        setDueTime(editTask.dueTime);
        const cat = editTask.category || '';
        setCategory(cat);
        setCategoryDisplay(cat ? translateCategory(cat, t) : '');
        setPriority(editTask.priority);
      } else {
        // Prefill with the selected date (fallback to today)
        const initialDate = defaultDate ? new Date(defaultDate) : new Date();
        setDueDate(initialDate);
        setDueTime(undefined);
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
      setCategoryDisplay('');
      setPriority(undefined);
      setShowSmartSuggestions(false);
      setSmartSuggestion(null);
      setShowCategoryPicker(false);
      setFilteredCategories([]);
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible, editTask, defaultDate, translateY, t]);

  // Filter categories based on input
  useEffect(() => {
    if (categoryDisplay.trim()) {
      const searchTerm = categoryDisplay.toLowerCase();
      const filtered = PREDEFINED_CATEGORIES.filter(cat => {
        const translatedCat = translateCategory(cat, t).toLowerCase();
        const englishCat = cat.toLowerCase();
        return translatedCat.includes(searchTerm) || englishCat.includes(searchTerm);
      });
      setFilteredCategories(filtered);
    } else if (showCategoryPicker) {
      // Show all categories when input is empty but picker is open
      setFilteredCategories([...PREDEFINED_CATEGORIES]);
    } else {
      setFilteredCategories([]);
    }
  }, [categoryDisplay, showCategoryPicker, t]);

  // Define generateSmartSuggestion before useEffect
  const generateSmartSuggestion = React.useCallback(() => {
    try {
      const taskInput: TaskInput = {
        title: title.trim() || t('task.newTaskPlaceholder'),
        notes: notes.trim() || undefined,
        dueDate,
        dueTime,
        category: category.trim() || undefined,
        priority: priority || 'medium',
      };

      const suggestions = SmartPlanningService.getSmartSuggestions(taskInput);
      setSmartSuggestion({
        suggestedTime: suggestions.suggestedTime,
        confidence: suggestions.confidence,
        reason: suggestions.reason,
      });
      setShowSmartSuggestions(true);

      // Auto-scroll to show suggestions
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error generating smart suggestion:', error);
    }
  }, [title, dueDate, dueTime, category, priority]);

  // Generate smart suggestion when priority or category changes
  useEffect(() => {
    if (visible && !editTask && (priority || category.trim())) {
      generateSmartSuggestion();
    }
  }, [priority, category, visible, editTask, generateSmartSuggestion]);

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
      priority: priority || 'medium',
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
        <Animated.View style={[styles.modalContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow }, animatedStyle]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {editTask ? t('task.editTask') : t('task.createTask')}
            </Text>
            <Pressable onPress={onClose}>
              <Icon name="close" size={24} color={colors.textSecondary} />
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
              key={scrollKey}
              ref={scrollViewRef}
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentOffset={{ x: 0, y: 0 }}
            >
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('task.title')} *</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceSecondary }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('task.title')}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('task.notes')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceSecondary }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('task.notes')}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('task.category')}</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceSecondary }]}
                  value={categoryDisplay}
                  onChangeText={(text) => {
                    setCategoryDisplay(text);
                    setCategory(text); // Keep category in sync for custom categories
                  }}
                  placeholder={t('task.category')}
                  placeholderTextColor={colors.textTertiary}
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
                            setCategory(cat); // Store English key
                            setCategoryDisplay(translateCategory(cat, t)); // Display translated
                            setShowCategoryPicker(false);
                          }}
                        >
                          <Text style={styles.categoryItemText}>
                            {translateCategory(cat, t)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('task.priority')}</Text>
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
                      onPress={() =>
                        setPriority(priority === p ? undefined : p)
                      }
                    >
                      <Icon
                        name={getPriorityIcon(p)}
                        size={18}
                        color={priority === p ? '#FFFFFF' : '#666'}
                        style={styles.priorityIcon}
                      />
                      <Text
                        style={[
                          styles.priorityText,
                          priority === p && styles.priorityTextActive,
                        ]}
                      >
                        {getPriorityLabel(p)}
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
                    <Text style={styles.label}>{t('task.dueDate')}</Text>
                    <View style={styles.accordionValueRow}>
                      <Icon name="calendar-outline" size={18} color="#666" />
                      <Text style={styles.accordionValue}>
                        {formatDateWithLocale(dueDate, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <Icon
                    name={showDatePicker ? 'chevron-down' : 'chevron-forward'}
                    size={20}
                    color="#999"
                  />
                </Pressable>

                {/* Date Picker - Inline Accordion */}
                {showDatePicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={dueDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={(_event, selectedDate) => {
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
                    <Text style={styles.label}>{t('task.dueTimeOptional')}</Text>
                    <View style={styles.accordionValueRow}>
                      <Icon name="time-outline" size={18} color="#666" />
                      <Text style={styles.accordionValue}>
                        {dueTime ? formatTime(dueTime) : t('task.setTime')}
                      </Text>
                    </View>
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
                        <Icon name="close" size={16} color="#FFFFFF" />
                      </Pressable>
                    )}
                    <Icon
                      name={showTimePicker ? 'chevron-down' : 'chevron-forward'}
                      size={20}
                      color="#999"
                    />
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
                      onChange={(_event, selectedTime) => {
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
                    <View style={styles.suggestionTitleRow}>
                      <Icon name="bulb-outline" size={20} color="#6366F1" />
                      <Text style={styles.suggestionTitle}>
                        {t('task.smartSuggestion')}
                      </Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {t('task.smartSuggestionMatch', {
                          percent: Math.round(smartSuggestion.confidence * 100),
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.suggestionReason}>
                    {smartSuggestion.reason}
                  </Text>
                  <Text style={styles.suggestionTime}>
                    {t('task.smartSuggestionTime', {
                      date: formatDateWithLocale(smartSuggestion.suggestedTime, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      }),
                      time: formatTime(smartSuggestion.suggestedTime),
                    })}
                  </Text>
                  <Pressable
                    style={styles.applySuggestionButton}
                    onPress={applySuggestion}
                  >
                    <Text style={styles.applySuggestionText}>
                      {t('task.applySuggestion')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </Pressable>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable style={[styles.cancelButton, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                !title.trim() && { backgroundColor: colors.disabled },
              ]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
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

const getPriorityIcon = (priority: 'low' | 'medium' | 'high') => {
  switch (priority) {
    case 'high':
      return 'alert-circle';
    case 'medium':
      return 'remove-circle';
    case 'low':
      return 'checkmark-circle';
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
    height: '90%',
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAFAFA',
  },
  priorityIcon: {
    marginRight: 4,
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
    marginLeft: 6,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 8,
  },
  accordionValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
