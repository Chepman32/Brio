/**
 * Search and Deduplication Service
 * Offline search with indexing and duplicate detection
 */

import { TaskType } from '../types';
import {
  normalizeTitle,
  calculateTitleSimilarity,
  generateTrigrams,
} from '../utils/textNormalization';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'search-index' });

interface SearchIndex {
  taskId: string;
  tokens: string[];
  trigrams: string[];
  category?: string;
  priority: string;
  dueTimestamp?: number;
}

interface SearchResult {
  task: TaskType;
  score: number;
  matches: string[];
}

class SearchAndDedupeServiceClass {
  private readonly SIMILARITY_THRESHOLD = 0.9;

  /**
   * Build search index for tasks
   */
  buildIndex(tasks: TaskType[]): void {
    const index: SearchIndex[] = [];

    for (const task of tasks) {
      const normalized = normalizeTitle(task.title);
      const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
      const trigrams = Array.from(generateTrigrams(normalized));

      index.push({
        taskId: task._id,
        tokens,
        trigrams,
        category: task.category,
        priority: task.priority,
        dueTimestamp: task.dueDate?.getTime(),
      });
    }

    storage.set('search-index', JSON.stringify(index));
  }

  /**
   * Search tasks with query
   */
  search(
    query: string,
    tasks: TaskType[],
    filters?: {
      category?: string;
      priority?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): SearchResult[] {
    if (!query.trim()) return [];

    const index = this.loadIndex();
    const normalizedQuery = normalizeTitle(query);
    const queryTokens = normalizedQuery.split(/\s+/);
    const queryTrigrams = Array.from(generateTrigrams(normalizedQuery));

    const results: SearchResult[] = [];

    for (const entry of index) {
      // Apply filters
      if (filters?.category && entry.category !== filters.category) continue;
      if (filters?.priority && entry.priority !== filters.priority) continue;
      if (
        filters?.dateFrom &&
        entry.dueTimestamp &&
        entry.dueTimestamp < filters.dateFrom.getTime()
      )
        continue;
      if (
        filters?.dateTo &&
        entry.dueTimestamp &&
        entry.dueTimestamp > filters.dateTo.getTime()
      )
        continue;

      // Calculate match score
      let score = 0;
      const matches: string[] = [];

      // Token matching
      for (const queryToken of queryTokens) {
        for (const token of entry.tokens) {
          if (token.includes(queryToken) || queryToken.includes(token)) {
            score += 1.0;
            matches.push(token);
          }
        }
      }

      // Trigram matching (fuzzy)
      const trigramMatches = queryTrigrams.filter(t =>
        entry.trigrams.includes(t),
      ).length;
      const trigramScore =
        trigramMatches / Math.max(queryTrigrams.length, entry.trigrams.length);
      score += trigramScore * 0.5;

      if (score > 0) {
        const task = tasks.find(t => t._id === entry.taskId);
        if (task) {
          results.push({ task, score, matches });
        }
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Find duplicate tasks
   */
  findDuplicates(tasks: TaskType[]): Array<{
    task1: TaskType;
    task2: TaskType;
    similarity: number;
    shouldMerge: boolean;
  }> {
    const duplicates: Array<{
      task1: TaskType;
      task2: TaskType;
      similarity: number;
      shouldMerge: boolean;
    }> = [];

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = tasks[i];
        const task2 = tasks[j];

        // Skip if both completed
        if (task1.completed && task2.completed) continue;

        const similarity = calculateTitleSimilarity(task1.title, task2.title);

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          // Check additional criteria for auto-merge
          const shouldMerge = this.shouldAutoMerge(task1, task2, similarity);

          duplicates.push({
            task1,
            task2,
            similarity,
            shouldMerge,
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Determine if tasks should be auto-merged
   */
  private shouldAutoMerge(
    task1: TaskType,
    task2: TaskType,
    similarity: number,
  ): boolean {
    // Must be very similar
    if (similarity < 0.95) return false;

    // Must have same category
    if (task1.category !== task2.category) return false;

    // Must have close due dates (within 1 day)
    if (task1.dueDate && task2.dueDate) {
      const daysDiff =
        Math.abs(task1.dueDate.getTime() - task2.dueDate.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysDiff > 1) return false;
    }

    // One must be less detailed (merge into more detailed)
    const detail1 = (task1.notes?.length || 0) + (task1.dueTime ? 1 : 0);
    const detail2 = (task2.notes?.length || 0) + (task2.dueTime ? 1 : 0);

    return detail1 !== detail2;
  }

  /**
   * Merge two tasks (keep more detailed one)
   */
  mergeTasks(task1: TaskType, task2: TaskType): TaskType {
    // Determine which is more detailed
    const detail1 =
      (task1.notes?.length || 0) +
      (task1.dueTime ? 10 : 0) +
      (task1.category ? 5 : 0);
    const detail2 =
      (task2.notes?.length || 0) +
      (task2.dueTime ? 10 : 0) +
      (task2.category ? 5 : 0);

    const primary = detail1 >= detail2 ? task1 : task2;
    const secondary = detail1 >= detail2 ? task2 : task1;

    // Merge fields
    return {
      ...primary,
      notes: primary.notes || secondary.notes,
      dueTime: primary.dueTime || secondary.dueTime,
      category: primary.category || secondary.category,
      priority: this.mergePriority(primary.priority, secondary.priority),
    };
  }

  /**
   * Merge priority (take higher)
   */
  private mergePriority(p1: string, p2: string): 'low' | 'medium' | 'high' {
    const order = { low: 0, medium: 1, high: 2 };
    const val1 = order[p1 as keyof typeof order] || 0;
    const val2 = order[p2 as keyof typeof order] || 0;

    const result = Math.max(val1, val2);
    return ['low', 'medium', 'high'][result] as 'low' | 'medium' | 'high';
  }

  /**
   * Get search suggestions based on history
   */
  getSearchSuggestions(partialQuery: string, tasks: TaskType[]): string[] {
    if (partialQuery.length < 2) return [];

    const normalized = normalizeTitle(partialQuery);
    const suggestions = new Set<string>();

    // Get unique words from task titles
    for (const task of tasks) {
      const words = normalizeTitle(task.title).split(/\s+/);
      for (const word of words) {
        if (word.startsWith(normalized) && word.length > normalized.length) {
          suggestions.add(word);
        }
      }
    }

    // Get unique categories
    for (const task of tasks) {
      if (
        task.category &&
        task.category.toLowerCase().includes(partialQuery.toLowerCase())
      ) {
        suggestions.add(task.category);
      }
    }

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Highlight matches in text
   */
  highlightMatches(
    text: string,
    matches: string[],
  ): Array<{ text: string; highlight: boolean }> {
    if (matches.length === 0) {
      return [{ text, highlight: false }];
    }

    const normalized = normalizeTitle(text);
    const parts: Array<{ text: string; highlight: boolean }> = [];
    let lastIndex = 0;

    for (const match of matches) {
      const index = normalized.indexOf(match, lastIndex);
      if (index === -1) continue;

      // Add non-highlighted part
      if (index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, index),
          highlight: false,
        });
      }

      // Add highlighted part
      parts.push({
        text: text.substring(index, index + match.length),
        highlight: true,
      });

      lastIndex = index + match.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        highlight: false,
      });
    }

    return parts;
  }

  /**
   * Load search index
   */
  private loadIndex(): SearchIndex[] {
    const data = storage.getString('search-index');
    return data ? JSON.parse(data) : [];
  }
}

export const SearchAndDedupeService = new SearchAndDedupeServiceClass();
