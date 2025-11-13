/**
 * NLP Task Input Component
 * Natural language input for creating tasks
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { TaskType } from '../types';
import { useAI } from '../hooks/useAI';

interface NLPTaskInputProps {
  tasks: TaskType[];
  onCreateTask: (task: any) => void;
  onClose: () => void;
}

export const NLPTaskInput: React.FC<NLPTaskInputProps> = ({
  tasks,
  onCreateTask,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const { parseNaturalLanguage } = useAI(tasks);

  const handleParse = useCallback(async () => {
    if (!input.trim()) return;

    setParsing(true);
    try {
      const result = await parseNaturalLanguage(input);
      setSuggestion(result);
    } catch (error) {
      console.error('Error parsing input:', error);
    } finally {
      setParsing(false);
    }
  }, [input, parseNaturalLanguage]);

  const handleCreate = useCallback(() => {
    if (!suggestion) return;

    const task = {
      title: suggestion.parsedIntent.title,
      dueDate: suggestion.parsedIntent.when || suggestion.suggestedTime,
      category: suggestion.parsedIntent.category,
      priority:
        suggestion.priorityScore >= 0.7
          ? 'high'
          : suggestion.priorityScore >= 0.4
          ? 'medium'
          : 'low',
      notes:
        suggestion.parsedIntent.tags.length > 0
          ? `Tags: ${suggestion.parsedIntent.tags.join(', ')}`
          : undefined,
    };

    onCreateTask(task);
    onClose();
  }, [suggestion, onCreateTask, onClose]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✨ Создать задачу</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Например: Позвонить врачу завтра в 9 утра"
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          multiline
          autoFocus
        />
        <TouchableOpacity
          style={[
            styles.parseButton,
            !input.trim() && styles.parseButtonDisabled,
          ]}
          onPress={handleParse}
          disabled={!input.trim() || parsing}
        >
          {parsing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.parseButtonText}>Разобрать</Text>
          )}
        </TouchableOpacity>
      </View>

      {suggestion && (
        <ScrollView style={styles.suggestionContainer}>
          {/* Duplicate Warning */}
          {suggestion.duplicateWarning && (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>⚠️ Похожая задача</Text>
              <Text style={styles.warningText}>
                Уже есть: "{suggestion.duplicateWarning.existingTask.title}"
              </Text>
              <Text style={styles.warningSubtext}>
                Похожесть:{' '}
                {(suggestion.duplicateWarning.similarity * 100).toFixed(0)}%
              </Text>
            </View>
          )}

          {/* Parsed Intent */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Задача</Text>
            <Text style={styles.taskTitle}>
              {suggestion.parsedIntent.title}
            </Text>
          </View>

          {/* When */}
          {(suggestion.parsedIntent.when || suggestion.suggestedTime) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 Когда</Text>
              <Text style={styles.cardText}>
                {suggestion.parsedIntent.when
                  ? new Date(suggestion.parsedIntent.when).toLocaleString(
                      'ru-RU',
                    )
                  : `Предложено: ${new Date(
                      suggestion.suggestedTime,
                    ).toLocaleString('ru-RU')}`}
              </Text>
            </View>
          )}

          {/* Repeat */}
          {suggestion.parsedIntent.repeat && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔄 Повтор</Text>
              <Text style={styles.cardText}>
                {suggestion.parsedIntent.repeat.freq === 'daily' &&
                  'Каждый день'}
                {suggestion.parsedIntent.repeat.freq === 'weekly' &&
                  'Каждую неделю'}
                {suggestion.parsedIntent.repeat.freq === 'monthly' &&
                  'Каждый месяц'}
                {suggestion.parsedIntent.repeat.interval > 1 &&
                  ` (интервал: ${suggestion.parsedIntent.repeat.interval})`}
              </Text>
            </View>
          )}

          {/* Category */}
          {suggestion.parsedIntent.category && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏷️ Категория</Text>
              <Text style={styles.cardText}>
                {suggestion.parsedIntent.category}
              </Text>
            </View>
          )}

          {/* Priority */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ Приоритет</Text>
            <View style={styles.priorityBar}>
              <View
                style={[
                  styles.priorityFill,
                  { width: `${suggestion.priorityScore * 100}%` },
                  suggestion.priorityScore >= 0.7 && styles.priorityHigh,
                  suggestion.priorityScore >= 0.4 &&
                    suggestion.priorityScore < 0.7 &&
                    styles.priorityMedium,
                  suggestion.priorityScore < 0.4 && styles.priorityLow,
                ]}
              />
            </View>
            <Text style={styles.priorityText}>
              {suggestion.priorityScore >= 0.7 && 'Высокий'}
              {suggestion.priorityScore >= 0.4 &&
                suggestion.priorityScore < 0.7 &&
                'Средний'}
              {suggestion.priorityScore < 0.4 && 'Низкий'} (
              {(suggestion.priorityScore * 100).toFixed(0)}%)
            </Text>
          </View>

          {/* Tags */}
          {suggestion.parsedIntent.tags.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏷️ Теги</Text>
              <View style={styles.tagsContainer}>
                {suggestion.parsedIntent.tags.map(
                  (tag: string, index: number) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          )}

          {/* Errors */}
          {suggestion.parsedIntent.errors &&
            suggestion.parsedIntent.errors.length > 0 && (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>⚠️ Предупреждения</Text>
                {suggestion.parsedIntent.errors.map(
                  (error: string, index: number) => (
                    <Text key={index} style={styles.errorText}>
                      • {error}
                    </Text>
                  ),
                )}
              </View>
            )}

          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Text style={styles.createButtonText}>✓ Создать задачу</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {!suggestion && !parsing && (
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>Примеры:</Text>
          <Text style={styles.exampleText}>• "Купить молоко завтра утром"</Text>
          <Text style={styles.exampleText}>
            • "Позвонить врачу в пятницу в 14:00"
          </Text>
          <Text style={styles.exampleText}>• "Оплатить счёт каждый месяц"</Text>
          <Text style={styles.exampleText}>
            • "Тренировка каждый понедельник"
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
    marginBottom: 12,
  },
  parseButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  parseButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  parseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestionContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#1F2937',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 2,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#92400E',
  },
  priorityBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  priorityFill: {
    height: '100%',
  },
  priorityHigh: {
    backgroundColor: '#EF4444',
  },
  priorityMedium: {
    backgroundColor: '#F59E0B',
  },
  priorityLow: {
    backgroundColor: '#10B981',
  },
  priorityText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 4,
  },
  createButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  examplesContainer: {
    padding: 16,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
});
