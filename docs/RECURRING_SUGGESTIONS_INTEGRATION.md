# Recurring Task Suggestions - Integration Guide

## Quick Start

The recurring task suggestions system is now integrated into your app. Here's how to use it:

## 1. Automatic Pattern Learning

Pattern learning happens automatically when users create tasks. No additional code needed!

```typescript
// This already logs patterns automatically
import { createTask } from './database/operations/taskOperations';

const task = createTask({
  title: 'Go gym',
  dueDate: new Date('2025-11-18'), // Monday
  category: 'health',
  priority: 'medium',
});
// ✅ Pattern learning happens in the background
```

## 2. Enable Suggestions in Your App

Add the hook to your main app component or screen:

```typescript
// In App.tsx or your main screen
import { useRecurringSuggestions } from './hooks/useRecurringSuggestions';

function App() {
  const { initialized, pendingSuggestions } = useRecurringSuggestions();

  useEffect(() => {
    if (initialized) {
      console.log(`${pendingSuggestions.length} suggestions scheduled`);
    }
  }, [initialized, pendingSuggestions]);

  // Rest of your app...
}
```

## 3. Add Patterns Management UI (Optional)

Add a button in your settings screen to view/manage patterns:

```typescript
import { RecurringPatternsView } from './components/RecurringPatternsView';

function SettingsScreen() {
  const [showPatterns, setShowPatterns] = useState(false);

  return (
    <View>
      {/* Your settings UI */}

      <TouchableOpacity onPress={() => setShowPatterns(true)}>
        <Text>Manage Recurring Patterns</Text>
      </TouchableOpacity>

      <Modal visible={showPatterns} animationType="slide">
        <RecurringPatternsView onClose={() => setShowPatterns(false)} />
      </Modal>
    </View>
  );
}
```

## 4. Handle Notification Actions

The hook automatically handles notification responses, but you can customize:

```typescript
const { handleAddTask, handleDismissSuggestion, getPatternStats } =
  useRecurringSuggestions();

// Add task from suggestion
await handleAddTask(
  'go gym::1', // pattern key
  'Go gym', // display title
  1, // target day (Monday)
  false, // add for target day (not today)
);

// Dismiss suggestion
await handleDismissSuggestion('go gym::1');

// Get statistics
const stats = await getPatternStats();
console.log(`${stats.activePatterns} active patterns`);
```

## 5. Customize Configuration (Optional)

Override default configuration when initializing:

```typescript
import { RecurringSuggestionService } from './services/RecurringSuggestionService';
import { getRealm } from './database/realm';

const realm = getRealm();
await RecurringSuggestionService.initialize(realm, {
  minOccurrences: 2, // Suggest after 2 occurrences (default: 3)
  maxSuggestionsPerDay: 3, // Allow 3 suggestions/day (default: 2)
  dismissCooldownWeeks: 1, // 1 week cooldown (default: 2)
  quietHoursStart: 44, // 22:00 (bin 44)
  quietHoursEnd: 16, // 08:00 (bin 16)
});
```

## How It Works

### Pattern Detection Flow

```
User creates task
    ↓
Task logged with:
  - Normalized title
  - Creation time (day + 30-min bin)
  - Target day (from due date or title)
    ↓
Pattern model updated:
  - Add to occurrences
  - Update time clusters
  - Detect cadence (weekly/biweekly/monthly)
    ↓
If pattern has ≥3 occurrences:
  - Calculate learned creation slot
  - Schedule suggestion notification
    ↓
At learned time:
  - Check if task already added
  - If not, send suggestion
    ↓
User responds:
  - Accept → Create task, reinforce pattern
  - Dismiss → Cool-down period
  - Ignore → Increment ignore count
```

### Example Scenario

**Week 1-3**: User adds "Go gym" for Monday on Sunday at 17:00

**System learns**:

- Pattern: "go gym::1" (Monday)
- Creation slot: Sunday 17:00
- Cadence: weekly
- Confidence: 90%

**Week 4, Sunday 17:00**:

- Notification: "Add 'Go gym' for Monday?"
- Body: "You usually add this Sundays at 17:00 (3 times)"
- Actions: [Add for Monday] [Add for today] [Skip]

**If user shifts time**:

- Weeks 4-5: Adds at Sunday 13:00 instead
- System detects shift after 2 occurrences
- Week 6: Suggests at 13:00 (new time)

## Notification Format

Suggestions appear as local notifications:

```
📋 Add "Go gym" for Monday?
You usually add this Sundays at 17:00 (3 times)

[Add for Monday] [Add for today] [Skip]
```

## Testing

### Test Pattern Learning

```typescript
// Create same task 3 times
for (let i = 0; i < 3; i++) {
  await createTask({
    title: 'Test task',
    dueDate: getNextMonday(),
    category: 'test',
    priority: 'medium',
  });

  // Wait a week between creations
  await new Promise(resolve => setTimeout(resolve, 7 * 24 * 60 * 60 * 1000));
}

// Check pattern was created
const patterns = await RecurringSuggestionService.getAllPatterns();
console.log('Patterns:', patterns);
```

### Test Suggestions

```typescript
// Plan suggestions for next 7 days
const suggestions =
  await RecurringSuggestionService.planSuggestionNotifications(7);
console.log(`${suggestions.length} suggestions planned`);

suggestions.forEach(s => {
  console.log(`${s.title} at ${new Date(s.fireDate).toLocaleString()}`);
});
```

### Test Time Shift

```typescript
// Create pattern at 17:00
await createTaskAt('Go gym', getNextMonday(), 17, 0); // Sunday 17:00
await createTaskAt('Go gym', getNextMonday(), 17, 0); // Sunday 17:00

// Shift to 13:00
await createTaskAt('Go gym', getNextMonday(), 13, 0); // Sunday 13:00
await createTaskAt('Go gym', getNextMonday(), 13, 0); // Sunday 13:00

// Check learned slot
const pattern = await RecurringSuggestionService.getAllPatterns().find(
  p => p.displayTitle === 'Go gym',
);
const slot = RecurringSuggestionService.learnedCreationSlot(pattern);
console.log(`Learned slot: ${slot.dow} at bin ${slot.bin}`); // Should be 13:00
```

## Debugging

### View All Patterns

```typescript
const patterns = await RecurringSuggestionService.getAllPatterns();
patterns.forEach(p => {
  console.log(`Pattern: ${p.displayTitle}`);
  console.log(`  Key: ${p.key}`);
  console.log(`  Cadence: ${p.cadence}`);
  console.log(`  Occurrences: ${p.occurrences.length}`);
  console.log(`  Clusters: ${p.clusters.length}`);

  const slot = RecurringSuggestionService.learnedCreationSlot(p);
  if (slot) {
    console.log(
      `  Learned: Day ${slot.dow}, Bin ${slot.bin} (${slot.confidence * 100}%)`,
    );
  }
});
```

### Check Pattern Stats

```typescript
const stats = await RecurringSuggestionService.getPatternStats();
console.log('Pattern Statistics:');
console.log(`  Total: ${stats.totalPatterns}`);
console.log(`  Active: ${stats.activePatterns}`);
console.log(`  Weekly: ${stats.weeklyPatterns}`);
console.log(`  Biweekly: ${stats.biweeklyPatterns}`);
console.log(`  Monthly: ${stats.monthlyPatterns}`);
console.log(`  Paused: ${stats.pausedPatterns}`);
```

### View Pending Notifications

```typescript
import PushNotificationIOS from '@react-native-community/push-notification-ios';

PushNotificationIOS.getPendingNotificationRequests(notifications => {
  const suggestions = notifications.filter(
    n => n.userInfo?.type === 'recurring_suggestion',
  );

  console.log(`${suggestions.length} suggestion notifications pending`);
  suggestions.forEach(n => {
    console.log(`  ${n.title} at ${n.fireDate}`);
  });
});
```

## Performance Considerations

- **Pattern updates**: O(1) per task creation (very fast)
- **Suggestion planning**: O(n) where n = number of patterns (runs on app open)
- **Memory**: ~1KB per pattern
- **Storage**: Efficient Realm binary format
- **Battery**: Minimal (local notifications only)

## Privacy

- ✅ 100% offline processing
- ✅ No data leaves device
- ✅ No tracking or analytics
- ✅ User can view/delete any pattern
- ✅ Patterns stored locally in Realm

## Troubleshooting

### Patterns not being detected

- Ensure ≥3 occurrences of the same task
- Check that creation times are consistent
- Verify task titles are similar (fuzzy matching threshold: 0.9)

### Suggestions not appearing

- Check notification permissions
- Verify pattern cadence is not "irregular"
- Check if pattern is paused (too many ignores)
- Look for cool-down period after dismiss

### Wrong suggestion time

- Need more occurrences to stabilize
- Check time clusters in pattern details
- Recent shift requires 2 occurrences to promote

### Too many suggestions

- Reduce `maxSuggestionsPerDay` config
- Set quiet hours
- Dismiss unwanted patterns

## Next Steps

1. ✅ Pattern learning is automatic
2. ✅ Add `useRecurringSuggestions()` hook to your app
3. ✅ (Optional) Add patterns management UI
4. ✅ (Optional) Customize configuration
5. ✅ Test with real usage patterns

The system will learn and improve as users create tasks naturally!
