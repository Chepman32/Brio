# AI Integration Quick Start

## Быстрая интеграция AI-фич в существующее приложение

### Шаг 1: Установка зависимостей

Все сервисы уже используют существующие зависимости:

- `react-native-mmkv` - уже установлен
- `realm` - уже установлен

### Шаг 2: Добавление AI Dashboard на главный экран

```typescript
// src/screens/TodayScreen.tsx
import { AIDashboard } from '../components';
import { useRealm, useQuery } from '@realm/react';
import { TaskType } from '../types';

export const TodayScreen = () => {
  const realm = useRealm();
  const tasks = useQuery<TaskType>('Task');

  return (
    <View>
      <AIDashboard
        tasks={tasks}
        onTaskPress={task => {
          // Открыть детали задачи
        }}
        onCreateTask={title => {
          // Создать задачу
        }}
        onMergeTasks={(task1, task2) => {
          // Объединить задачи
        }}
      />
    </View>
  );
};
```

### Шаг 3: Замена обычного ввода на NLP

```typescript
// Вместо обычной модали создания
<NLPTaskInput
  tasks={tasks}
  onCreateTask={taskData => {
    realm.write(() => {
      realm.create('Task', {
        _id: new BSON.ObjectId().toString(),
        ...taskData,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }}
  onClose={() => setModalVisible(false)}
/>
```

### Шаг 4: Добавление умного Snooze

```typescript
import { useAI } from '../hooks/useAI';

const { getSnoozeOptions, onTaskSnoozed } = useAI(tasks);

const handleSnooze = (task: TaskType) => {
  const options = getSnoozeOptions(task);

  // Показать опции пользователю
  Alert.alert(
    'Отложить задачу',
    'Выберите время:',
    options.map(opt => ({
      text: opt.label,
      onPress: () => {
        const newDate = new Date();
        newDate.setMinutes(newDate.getMinutes() + opt.minutes);

        realm.write(() => {
          task.snoozedUntil = newDate;
        });

        onTaskSnoozed(task, opt.minutes, false);
      },
    })),
  );
};
```

### Шаг 5: Обработка завершения задачи

```typescript
const { onTaskCompleted } = useAI(tasks);

const handleComplete = async (task: TaskType) => {
  realm.write(() => {
    task.completed = true;
    task.completedAt = new Date();
  });

  const result = await onTaskCompleted(task, tasks);

  // Показать предложения цепочек
  if (result.chainSuggestions) {
    Alert.alert(
      'Обычно после этого вы делаете:',
      result.chainSuggestions.join('\n'),
      [
        {
          text: 'Создать все',
          onPress: () => createChainTasks(result.chainSuggestions),
        },
        { text: 'Пропустить' },
      ],
    );
  }
};
```

### Шаг 6: Периодический анализ

Добавьте в `App.tsx` или главный экран:

```typescript
import { AICoordinatorService } from './services/AICoordinatorService';

useEffect(() => {
  // Запускать при открытии приложения
  const runAnalysis = async () => {
    await AICoordinatorService.runPeriodicAnalysis(tasks);
  };

  runAnalysis();

  // Опционально: запускать каждые 24 часа
  const interval = setInterval(runAnalysis, 24 * 60 * 60 * 1000);

  return () => clearInterval(interval);
}, [tasks]);
```

### Шаг 7: Добавление поиска

```typescript
import { useState } from 'react';
import { useAI } from '../hooks/useAI';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const { searchTasks, getSearchSuggestions } = useAI(tasks);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const searchResults = await searchTasks(query);
    setResults(searchResults);
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    const suggestions = getSearchSuggestions(text);
    // Показать suggestions
  };

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={handleQueryChange}
        onSubmitEditing={handleSearch}
      />
      {results.map(result => (
        <TaskCard key={result.task._id} task={result.task} />
      ))}
    </View>
  );
};
```

## Оптимизация производительности

### 1. Ленивая загрузка дашборда

```typescript
const [showDashboard, setShowDashboard] = useState(false);

// Показывать только при скролле вниз или по кнопке
<TouchableOpacity onPress={() => setShowDashboard(true)}>
  <Text>📊 Показать AI инсайты</Text>
</TouchableOpacity>;

{
  showDashboard && <AIDashboard tasks={tasks} />;
}
```

### 2. Дебаунс для поиска

```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSearch = useMemo(
  () =>
    debounce(async query => {
      const results = await searchTasks(query);
      setResults(results);
    }, 300),
  [searchTasks],
);
```

### 3. Фоновый анализ паттернов

```typescript
import { InteractionManager } from 'react-native';

useEffect(() => {
  InteractionManager.runAfterInteractions(() => {
    AICoordinatorService.runPeriodicAnalysis(tasks);
  });
}, [tasks]);
```

## Тестирование

### Тест NLP парсера:

```typescript
import { NLPParserService } from './services/NLPParserService';

test('parses tomorrow morning', () => {
  const result = NLPParserService.parse('Buy milk tomorrow morning');
  expect(result.title).toBe('Buy milk');
  expect(result.when).toBeDefined();
  expect(result.when?.getHours()).toBe(9);
});
```

### Тест приоритизации:

```typescript
import { PriorityService } from './services/PriorityService';

test('urgent task has high priority', () => {
  const task = {
    title: 'Urgent doctor appointment',
    dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };
  const score = PriorityService.calculateScore(task);
  expect(score.score).toBeGreaterThan(0.7);
});
```

## Готово! 🎉

Теперь ваше приложение имеет мощный AI-движок, работающий полностью офлайн.
