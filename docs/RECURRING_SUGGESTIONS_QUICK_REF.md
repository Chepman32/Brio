# Recurring Task Suggestions - Quick Reference

## 🚀 Quick Start

```typescript
// 1. Add hook to your app (App.tsx or main screen)
import { useRecurringSuggestions } from './hooks/useRecurringSuggestions';

function App() {
  useRecurringSuggestions(); // ✅ Done! Patterns learn automatically
}
```

## 📋 How It Works

```
User creates task 3+ times → Pattern detected → Suggestion scheduled → User notified
```

## 🎯 Examples

### Weekly Pattern

```
Week 1-3: Add "Go gym" for Monday on Sunday 17:00
Week 4:   Notification at Sunday 17:00: "Add 'Go gym' for Monday?"
```

### Time Shift

```
Week 1-2: Add "Buy milk" on Sunday 17:00
Week 3-4: Add "Buy milk" on Sunday 13:00
Week 5:   Notification at Sunday 13:00 (new time detected)
```

## 🔧 Configuration

```typescript
await RecurringSuggestionService.initialize(realm, {
  minOccurrences: 3, // Min to suggest
  maxSuggestionsPerDay: 2, // Daily limit
  dismissCooldownWeeks: 2, // Wait after dismiss
  quietHoursStart: 44, // 22:00 (optional)
  quietHoursEnd: 16, // 08:00 (optional)
});
```

## 📊 API

```typescript
// Get statistics
const stats = await RecurringSuggestionService.getPatternStats();

// View all patterns
const patterns = await RecurringSuggestionService.getAllPatterns();

// Unpause pattern
await RecurringSuggestionService.unpausePattern(patternKey);

// Delete pattern
await RecurringSuggestionService.deletePattern(patternKey);
```

## 🎨 UI Component

```typescript
import { RecurringPatternsView } from './components/RecurringPatternsView';

<Modal visible={showPatterns}>
  <RecurringPatternsView onClose={() => setShowPatterns(false)} />
</Modal>;
```

## 🔍 Debugging

```typescript
// Check patterns
const patterns = await RecurringSuggestionService.getAllPatterns();
console.log(`${patterns.length} patterns learned`);

// Check suggestions
const suggestions =
  await RecurringSuggestionService.planSuggestionNotifications(7);
console.log(`${suggestions.length} suggestions planned`);

// View pattern details
patterns.forEach(p => {
  const slot = RecurringSuggestionService.learnedCreationSlot(p);
  console.log(
    `${p.displayTitle}: ${p.cadence}, ${slot?.confidence * 100}% confidence`,
  );
});
```

## 📱 Notification Format

```
📋 Add "Go gym" for Monday?
You usually add this Sundays at 17:00 (3 times)

[Add for Monday] [Add for today] [Skip]
```

## ⚙️ Pattern Detection

| Cadence   | Detection Rule                                      |
| --------- | --------------------------------------------------- |
| Weekly    | Last 3 occurrences in distinct weeks, ~1 week apart |
| Biweekly  | ≥66% of gaps are ~2 weeks (14±2 days)               |
| Monthly   | ≥66% of gaps are 3.5-5 weeks                        |
| Irregular | Doesn't match above (no suggestions)                |

## 🎯 User Responses

| Response | Effect                                 |
| -------- | -------------------------------------- |
| Accept   | Creates task, resets ignore count      |
| Dismiss  | 2-week cool-down, pattern stays active |
| Ignore   | Increments count, pauses after 3       |

## 🔐 Privacy

- ✅ 100% offline
- ✅ No tracking
- ✅ User control
- ✅ Local storage only

## 📈 Performance

- **Memory**: ~1KB per pattern
- **CPU**: Minimal (updates on task creation only)
- **Battery**: Negligible (local notifications)
- **Storage**: Efficient Realm binary format

## 🐛 Troubleshooting

| Issue                | Solution                                         |
| -------------------- | ------------------------------------------------ |
| Pattern not detected | Need ≥3 occurrences with consistent timing       |
| No suggestions       | Check cadence (must not be "irregular")          |
| Wrong time           | Need more occurrences to stabilize               |
| Too many suggestions | Reduce `maxSuggestionsPerDay` or set quiet hours |
| Pattern paused       | Unpause in patterns view or delete to re-learn   |

## 📚 Full Documentation

- `RECURRING_SUGGESTIONS_GUIDE.md` - Complete algorithm guide
- `RECURRING_SUGGESTIONS_INTEGRATION.md` - Integration instructions
- `RECURRING_SUGGESTIONS_SUMMARY.md` - Implementation summary

## ✨ Key Features

- ✅ Automatic pattern learning
- ✅ Time shift detection (17:00 → 13:00)
- ✅ Multiple cadences (weekly/biweekly/monthly)
- ✅ Fuzzy title matching
- ✅ Anti-spam protection
- ✅ Quiet hours support
- ✅ User management UI
- ✅ 100% offline & private

## 🎉 That's It!

Just add the hook and patterns will learn automatically. No configuration needed!
