# Troubleshooting Guide

## Realm Initialization Issues

### Problem: "Realm not initialized. Call initializeRealm() first"

**Причина**: Хуки пытаются использовать Realm до его инициализации.

**Решение**:

1. ✅ Добавлены задержки в `useRecurringSuggestions.ts`
2. ✅ Добавлена задержка в `useAI.ts`
3. ✅ Добавлен retry механизм

**Проверка**:

```typescript
// В App.tsx убедитесь, что Realm инициализируется первым
useEffect(() => {
  const init = async () => {
    await initializeRealm(); // Сначала Realm
    // Затем остальное
  };
  init();
}, []);
```

### Problem: Schema validation failed - unknown object types

**Причина**: Embedded типы не добавлены в конфигурацию Realm.

**Решение**: ✅ Исправлено в `src/database/realm.ts`

```typescript
schema: [
  Task,
  Achievement,
  UserStats,
  Settings,
  RTStats,
  PatternModel,
  Occurrence,
  TimeCluster,
];
```

## AI Services Issues

### Problem: AI Dashboard не загружается

**Причина**: Нет задач или Realm не готов.

**Решение**: ✅ Добавлена проверка `tasks.length === 0`

**Workaround**:

```typescript
const { dashboard, loading } = useAI(tasks);

if (loading || !dashboard) {
  return <LoadingIndicator />;
}
```

### Problem: NLP Parser не распознаёт даты

**Причина**: Формат даты не соответствует паттернам.

**Решение**: Используйте поддерживаемые форматы:

- "tomorrow" / "завтра"
- "friday" / "в пятницу"
- "9am" / "в 9 утра"
- "in 2 hours" / "через 2 часа"

### Problem: Pattern Detection не находит паттерны

**Причина**: Недостаточно данных (нужно минимум 3 повторения).

**Решение**: Подождите накопления истории или используйте тестовые данные.

## Performance Issues

### Problem: Медленная загрузка Dashboard

**Причина**: Большое количество задач.

**Решение**:

1. Используйте ленивую загрузку
2. Добавьте дебаунс
3. Кэшируйте результаты

```typescript
const [showDashboard, setShowDashboard] = useState(false);

// Показывать только по требованию
<TouchableOpacity onPress={() => setShowDashboard(true)}>
  <Text>Show AI Insights</Text>
</TouchableOpacity>;

{
  showDashboard && <AIDashboard tasks={tasks} />;
}
```

### Problem: Медленный поиск

**Причина**: Индекс не обновлён.

**Решение**: Вызывайте `SearchAndDedupeService.buildIndex(tasks)` периодически.

## Common Errors

### "Cannot read property 'map' of undefined"

**Причина**: Dashboard ещё не загружен.

**Решение**:

```typescript
{dashboard?.topPriorities?.map(task => ...)}
```

### "MMKV storage not found"

**Причина**: MMKV не инициализирован.

**Решение**: Убедитесь, что `react-native-mmkv` установлен:

```bash
npm install react-native-mmkv
cd ios && pod install
```

### "Task already exists" при создании через NLP

**Причина**: Дедупликация обнаружила похожую задачу.

**Решение**: Это нормально! Система предупреждает о дубликатах.

## Best Practices

### 1. Инициализация

```typescript
// App.tsx
useEffect(() => {
  const init = async () => {
    try {
      await initializeRealm();
      await AICoordinatorService.runPeriodicAnalysis(tasks);
    } catch (error) {
      console.error('Init error:', error);
    }
  };
  init();
}, []);
```

### 2. Error Handling

```typescript
try {
  const result = await parseNaturalLanguage(text);
  // Use result
} catch (error) {
  console.error('NLP error:', error);
  // Fallback to traditional input
}
```

### 3. Loading States

```typescript
if (loading) return <ActivityIndicator />;
if (!dashboard) return <EmptyState />;
return <AIDashboard dashboard={dashboard} />;
```

### 4. Graceful Degradation

```typescript
// Если AI не работает, используйте fallback
const priority = aiScore ?? 'medium';
const suggestedTime = aiTime ?? new Date();
```

## Debug Mode

Включите подробное логирование:

```typescript
// В начале App.tsx
if (__DEV__) {
  console.log('AI Debug Mode Enabled');

  // Логировать все AI операции
  const originalLog = console.log;
  console.log = (...args) => {
    if (args[0]?.includes?.('AI') || args[0]?.includes?.('Pattern')) {
      originalLog('[AI]', ...args);
    } else {
      originalLog(...args);
    }
  };
}
```

## Getting Help

1. Проверьте логи: `console.log` в сервисах
2. Проверьте Realm: `realm.objects('Task').length`
3. Проверьте MMKV: `storage.getString('task-chains')`
4. Проверьте документацию: `docs/AI_FEATURES_GUIDE.md`

## Known Limitations

1. NLP поддерживает только английский и русский
2. Pattern detection требует минимум 3 повторения
3. Search index обновляется не в реальном времени
4. RT stats требуют минимум 5 взаимодействий

## Quick Fixes

### Сбросить AI данные

```typescript
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
storage.clearAll(); // Осторожно! Удалит все AI данные
```

### Пересоздать индекс

```typescript
await SearchAndDedupeService.buildIndex(tasks);
```

### Пересчитать паттерны

```typescript
await PatternDetectionService.detectChains(completedTasks);
await PatternDetectionService.detectRecurringCreation(tasks);
```

### Обновить приоритеты

```typescript
const sorted = PriorityService.sortByPriority(tasks);
```

## Contact

Если проблема не решена, проверьте:

- `docs/AI_SYSTEM_OVERVIEW.md` - архитектура
- `docs/AI_INTEGRATION_QUICK_START.md` - примеры
- GitHub Issues (если проект на GitHub)
