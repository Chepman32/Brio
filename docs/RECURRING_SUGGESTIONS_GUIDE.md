# Recurring Task Suggestions Algorithm Guide

## Overview

The Recurring Task Suggestions system is an intelligent, offline algorithm that learns from user behavior to suggest tasks they typically add at specific times. It detects patterns like "Go gym on Monday" added every Sunday at 17:00, and proactively suggests adding the task if the user hasn't done so at the expected time.

## Key Features

- **Pattern Learning**: Automatically detects recurring task creation patterns
- **Time Intelligence**: Learns both the day and time users typically add tasks
- **Cadence Detection**: Identifies weekly, biweekly, monthly, and irregular patterns
- **Drift Handling**: Adapts when users shift their creation time (e.g., 17:00 → 13:00)
- **Fuzzy Matching**: Recognizes similar tasks ("Go gym", "Gym", "Gym workout")
- **Anti-Spam**: Limits suggestions and respects user dismissals
- **Fully Offline**: All processing happens on-device

## How It Works

### 1. Data Capture

Every time a user creates a task, the system logs:

- **Normalized title**: Cleaned version for pattern matching
- **Creation time**: Day-of-week and 30-minute time bin
- **Target day**: The day the task is for (from due date or title)
- **Category**: Task category for grouping
- **ISO week**: For tracking weekly patterns

### 2. Pattern Detection

The system builds a **PatternModel** for each unique task pattern:

```typescript
Pattern Key = normalizedTitle + "::" + targetDayOfWeek
Example: "go gym::1" (gym task for Monday)
```

Each pattern tracks:

- **Occurrences**: Last 32 creation events
- **Time clusters**: Up to 3 modes of creation times
- **EWMA bin**: Exponential moving average of creation time
- **Cadence**: weekly, biweekly, monthly, or irregular

### 3. Time Learning

The algorithm uses two methods to learn creation time:

#### EWMA (Exponential Weighted Moving Average)

- Smooths out noise in creation times
- Half-life of 6 weeks (configurable)
- Formula: `newBin = (1-α) * oldBin + α * currentBin`

#### Clustering

- Detects multiple creation time modes
- Merges times within ±2 bins (±1 hour)
- Tracks weight and recency for each cluster
- Handles shifts: If 2+ consecutive occurrences in new cluster, it becomes dominant

**Example**:

- Weeks 1-3: Created Sunday 17:00 → Cluster A (weight=3)
- Weeks 4-5: Created Sunday 13:00 → Cluster B (weight=2, recent)
- Result: Suggests at 13:00 (newer cluster wins)

### 4. Cadence Detection

**Weekly**: Last 3 occurrences in distinct weeks, ~1 week apart each

**Biweekly**: ≥66% of last 6 gaps are ~2 weeks (14±2 days)

**Monthly**: ≥66% of gaps are 3.5-5 weeks (28-35 days)

**Irregular**: Doesn't match above patterns (no suggestions)

### 5. Suggestion Logic

For each pattern that should be watched:

1. **Readiness Check**:

   - Pattern has ≥3 occurrences
   - Cadence is not irregular
   - Not in cool-down period (after dismiss)
   - Not paused (too many ignores)

2. **Slot Calculation**:

   - Determine dominant creation day-of-week (recency-weighted)
   - Choose best time cluster (highest recency-weighted score)
   - Calculate confidence based on cluster strength

3. **Scheduling**:

   - Schedule notification at learned creation time
   - 10 minutes before: Check if task already added (guard)
   - At time: Send suggestion if task still not added
   - Respect quiet hours (shift to after quiet window)

4. **Anti-Spam**:
   - Max 2 suggestions per day
   - Batch multiple suggestions for same time
   - Cool-down after dismiss (2 weeks default)
   - Pause after 3+ consecutive ignores

### 6. User Responses

**Accepted**: User adds the task

- Resets ignore count
- Reinforces the pattern
- Logs as new occurrence

**Dismissed**: User explicitly skips

- Enters cool-down period (2 weeks)
- Pattern still active after cool-down

**Ignored**: User doesn't respond

- Increments ignore count
- After 3 ignores, pattern is paused
- Can be manually unpaused

## Configuration

Default configuration (customizable):

```typescript
{
  minOccurrences: 3,              // Min occurrences to start suggesting
  binSizeMinutes: 30,             // Time bin size
  ewmaHalfLifeWeeks: 6,           // EWMA smoothing
  clusterMergeRadius: 2,          // Bins to merge (±1 hour)
  shiftPromotionThreshold: 2,     // Consecutive for new cluster
  dismissCooldownWeeks: 2,        // Wait after dismiss
  maxSuggestionsPerDay: 2,        // Daily limit
  maxIgnoresBeforePause: 3,       // Ignores before pause
  quietHoursStart: undefined,     // Optional quiet hours
  quietHoursEnd: undefined,
}
```

## Examples

### Example 1: Weekly Gym Task

**User Behavior**:

- Week 1: Adds "Go gym" for Monday on Sunday 17:00
- Week 2: Adds "Go gym" for Monday on Sunday 17:00
- Week 3: Adds "Go gym" for Monday on Sunday 17:00

**System Learning**:

- Pattern: "go gym::1" (Monday)
- Cadence: weekly
- Creation slot: Sunday 17:00
- Confidence: ~90%

**Week 4**:

- Sunday 16:50: Guard check (task not added yet)
- Sunday 17:00: Notification sent
  - Title: "Add 'Go gym' for Monday?"
  - Body: "You usually add this Sundays at 17:00 (3 times)"
  - Actions: [Add for Monday] [Add for today] [Skip]

### Example 2: Time Shift

**User Behavior**:

- Weeks 1-2: Adds "Buy milk" for Monday on Sunday 17:00
- Weeks 3-4: Adds "Buy milk" for Monday on Sunday 13:00

**System Learning**:

- Two clusters detected:
  - Cluster A: 17:00 (weight=2, older)
  - Cluster B: 13:00 (weight=2, recent)
- Shift detected: 2 consecutive in new cluster
- New suggestion time: Sunday 13:00

**Week 5**:

- Sunday 13:00: Notification sent (at new time)

### Example 3: Biweekly Pattern

**User Behavior**:

- Adds "Team meeting prep" every other Wednesday
- Created on Tuesday 20:30 before active weeks

**System Learning**:

- Pattern: "team meeting prep::3" (Wednesday)
- Cadence: biweekly
- Creation slot: Tuesday 20:30
- Only suggests on "active" weeks (based on ISO week parity)

## Integration

### 1. Initialize Service

```typescript
import { RecurringSuggestionService } from './services/RecurringSuggestionService';
import { getRealm } from './database/realm';

// In app initialization
const realm = getRealm();
await RecurringSuggestionService.initialize(realm);
```

### 2. Log Task Creation

```typescript
// Automatically logged in createTask operation
import { createTask } from './database/operations/taskOperations';

const task = createTask({
  title: 'Go gym',
  dueDate: mondayDate,
  category: 'health',
  priority: 'medium',
});
// Pattern learning happens automatically
```

### 3. Use Hook for Suggestions

```typescript
import { useRecurringSuggestions } from './hooks/useRecurringSuggestions';

function MyComponent() {
  const {
    initialized,
    pendingSuggestions,
    handleAddTask,
    handleDismissSuggestion,
    getPatternStats,
  } = useRecurringSuggestions();

  // Suggestions are automatically scheduled
  // Handle user responses through the hook
}
```

### 4. Display Patterns UI

```typescript
import { RecurringPatternsView } from './components/RecurringPatternsView';

<RecurringPatternsView onClose={() => setShowPatterns(false)} />;
```

## API Reference

### RecurringSuggestionService

#### `initialize(realm: Realm, config?: Partial<SuggestionConfig>)`

Initialize the service with Realm instance and optional config.

#### `logTaskCreation(title: string, category: string, dueDate?: Date, createdAt?: Date)`

Log a task creation event for pattern learning.

#### `planSuggestionNotifications(daysAhead: number = 7)`

Plan and schedule suggestion notifications for upcoming days.

#### `learnedCreationSlot(pattern: PatternModel)`

Get the learned creation day and time for a pattern.

#### `handleSuggestionResponse(patternKey: string, response: 'accepted' | 'dismissed' | 'ignored')`

Record user response to a suggestion.

#### `getPatternStats()`

Get statistics about all patterns.

#### `unpausePattern(patternKey: string)`

Unpause a pattern that was paused due to ignores.

#### `deletePattern(patternKey: string)`

Delete a pattern completely.

## Text Normalization

The system normalizes task titles for pattern matching:

1. **Lowercase**: "Go Gym" → "go gym"
2. **Remove stopwords**: "go to the gym" → "go gym"
3. **Remove special chars**: "Go gym!" → "go gym"
4. **Collapse spaces**: "go gym" → "go gym"

### Fuzzy Matching

Similar titles are merged using trigram Jaccard similarity:

- "Go gym" vs "Gym" → 0.85 similarity
- "Buy milk" vs "Get milk" → 0.92 similarity (merged)
- Threshold: 0.9 for merging

## Performance

- **Memory**: ~1KB per pattern (32 occurrences × 32 bytes)
- **Storage**: Realm database (efficient binary format)
- **CPU**: Minimal (pattern updates on task creation only)
- **Battery**: Negligible (local notifications, no background processing)

## Privacy

- **100% offline**: No data leaves the device
- **No tracking**: Only learns from user's own behavior
- **User control**: Can view, pause, or delete any pattern

## Troubleshooting

### Pattern not detected

- Need ≥3 occurrences
- Check if cadence is irregular
- Verify creation times are consistent

### Wrong suggestion time

- Check time clusters in pattern details
- May need more occurrences to stabilize
- Recent shift takes 2 occurrences to promote

### Too many suggestions

- Adjust `maxSuggestionsPerDay` config
- Set quiet hours
- Dismiss unwanted patterns

### Pattern paused

- Check ignore count (≥3 pauses)
- Manually unpause in patterns view
- Or delete and let it re-learn

## Future Enhancements

Possible improvements:

- Location-based patterns (e.g., "Buy milk" when near grocery store)
- Duration estimation from past tasks
- Smart batching of related tasks
- Integration with calendar events
- Multi-device sync (with privacy preservation)

## Technical Details

### Database Schema

```typescript
PatternModel {
  _id: string;                    // Primary key
  key: string;                    // Pattern key (indexed)
  category: string;
  displayTitle: string;
  normalizedTitle: string;
  occurrences: Occurrence[];      // Embedded objects
  ewmaBin: number;
  ewmaWeight: number;
  clusters: TimeCluster[];        // Embedded objects
  cadence: string;
  lastSuggestedAt?: number;
  lastUserResponse?: string;
  ignoredCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Time Bins

30-minute bins (0-47):

- 0 = 00:00-00:30
- 1 = 00:30-01:00
- ...
- 34 = 17:00-17:30
- ...
- 47 = 23:30-00:00

### ISO Week Calculation

Uses ISO 8601 week date system:

- Week starts on Monday
- Week 1 contains first Thursday of year
- Format: "YYYY-Www" (e.g., "2025-W46")

## Conclusion

The Recurring Task Suggestions algorithm provides intelligent, privacy-preserving task suggestions based on learned user patterns. It adapts to changes, respects user preferences, and operates entirely offline for maximum privacy and performance.
