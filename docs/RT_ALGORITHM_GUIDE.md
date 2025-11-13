# Reaction Time (RT) Based Notification Algorithm

## Overview

The RT-based notification algorithm is an intelligent, offline-compatible learning system that optimizes notification timing based on user behavior patterns. It tracks the time between notification delivery and user interaction (Reaction Time) to predict optimal notification windows.

## Key Features

### 1. **Reaction Time Tracking**

- Monitors time between notification delivery and user action
- Categorizes responses: quick (0-2min), short (2-10min), medium (10-30min), long (30-120min), ignored (>120min)
- Uses exponential weighted moving average (EWMA) with 14-day half-life for recency weighting

### 2. **Probabilistic Modeling**

- **Beta Distribution**: Models probability of opening within 5min and 30min
- **Log-Normal Distribution**: Models expected reaction time for opened notifications
- Priors: Beta(2,2) for probabilities, μ=ln(15min) for RT

### 3. **Multi-Dimensional Slot Analysis**

- Tracks statistics per (category × day-of-week × 30-min time bin)
- 48 time bins per day (30-minute intervals)
- Separate statistics for each category (Work, Personal, Fitness, etc.)

### 4. **Smart Scheduling**

- Scores candidate slots based on:
  - Quick response probability (50% weight)
  - 30-min response probability (30% weight)
  - Median reaction time (20% weight)
  - Deadline constraints
  - Fatigue penalty (based on ignore rate)
- Epsilon-greedy exploration (10%) to discover new patterns

### 5. **Adaptive Snooze**

- Proposes snooze intervals based on typical reaction time
- Suggests next high-probability window
- Dynamic options instead of fixed 5/10/15 minutes

### 6. **Channel Configuration**

- Adjusts notification volume based on engagement:
  - Silent/Quiet: Low engagement slots (p5m < 15%)
  - Normal: Standard engagement
  - Loud: High engagement slots (p5m > 50%, RT < 5min)

### 7. **Focus Windows**

- Identifies optimal time slots per category
- Displays "peak focus times" to users
- Used for smart task creation suggestions

## Implementation

### Core Services

#### NotificationRTService

Main service handling RT learning and predictions:

```typescript
import { NotificationRTService } from './services/NotificationRTService';

// Initialize
await NotificationRTService.initialize();

// Get optimal notification slot
const recommendation = await NotificationRTService.getOptimalSlot(
  'Work', // category
  'high', // priority
  dueDate.getTime(), // deadline (optional)
  30 * 60 * 1000, // estimated duration (optional)
);

// Log notification interaction
await NotificationRTService.logEvent({
  id: 'unique-event-id',
  taskId: 'task-123',
  category: 'Work',
  deliveredAt: deliveryTimestamp,
  openedAt: openTimestamp,
  action: 'open',
  dayOfWeek: 1, // Monday
  hourBin: 18, // 9:00 AM
  priority01: 1.0,
  dueInMinAtDelivery: 60,
  isSilent: false,
});

// Get smart snooze options
const snoozeOptions = await NotificationRTService.proposeSnoozeOptions(
  'Work',
  1, // Monday
  18, // 9:00 AM bin
);

// Get focus windows
const focusWindows = await NotificationRTService.getFocusWindows('Work');
```

### React Hooks

#### useNotificationRT

Hook for easy integration in components:

```typescript
import { useNotificationRT } from './hooks/useNotificationRT';

function MyComponent() {
  const {
    focusWindows,
    loading,
    getOptimalSlot,
    getSnoozeOptions,
    suggestBestTime,
  } = useNotificationRT('Work');

  // Get best time for new task
  const handleCreateTask = async () => {
    const bestTime = await suggestBestTime();
    // Use bestTime as default
  };

  // Get smart snooze options
  const handleSnooze = async () => {
    const options = await getSnoozeOptions();
    // Display options to user
  };

  return (
    <View>
      {focusWindows.map(window => (
        <Text key={window.startBin}>
          Best time: {formatTime(window.startBin)}
        </Text>
      ))}
    </View>
  );
}
```

#### useNotificationTracking

Hook for logging interactions:

```typescript
import { useNotificationTracking } from './hooks/useNotificationRT';

function TaskComponent({ task }) {
  const { logInteraction } = useNotificationTracking();

  const handleComplete = async () => {
    await logInteraction(
      task._id,
      'completeFromPush',
      task.category,
      task.priority,
    );
    // Complete task
  };

  const handleDismiss = async () => {
    await logInteraction(task._id, 'dismiss', task.category, task.priority);
  };
}
```

### Components

#### FocusWindowsDisplay

Visual component showing optimal time windows:

```typescript
import { FocusWindowsDisplay } from './components/FocusWindowsDisplay';

<FocusWindowsDisplay
  category="Work"
  onSelectWindow={window => {
    // Use selected window for task scheduling
  }}
/>;
```

## Integration with NotificationService

The RT service is integrated into the existing NotificationService:

```typescript
// NotificationService automatically uses RT optimization
await NotificationService.scheduleNotification(task);

// Get smart snooze options
const snoozeOptions = await NotificationService.getSmartSnoozeOptions(
  task._id,
  task.category,
);

// Log interactions (called automatically on notification tap)
await NotificationService.logNotificationInteraction(
  task._id,
  'open',
  task.category,
  task.priority,
);
```

## Algorithm Constants

```typescript
BIN_SIZE_MINUTES = 30        // 30-minute time bins
BINS_PER_DAY = 48            // 24 hours × 2
HALF_LIFE_MS = 14 days       // Recency weighting
IGNORE_CUTOFF_MS = 120 min   // Threshold for "ignored"
RT_REF_MS = 10 min           // Reference RT for scoring
EXPLORATION_EPSILON = 0.1    // 10% exploration rate
MIN_SAMPLES = 5              // Minimum for confidence

// Scoring weights
W_OPEN5 = 0.5               // Weight for 5-min open probability
W_OPEN30 = 0.3              // Weight for 30-min open probability
W_RT = 0.2                  // Weight for RT factor
```

## Data Storage

All statistics are stored locally using Realm:

- Key: `@brio_rt_stats`
- Structure: `RTStatsStorage` with versioning
- Automatic persistence after each update
- Offline-first design

## Example Use Cases

### 1. Smart Task Creation

```typescript
// When creating a task, suggest optimal time
const { suggestBestTime } = useNotificationRT(category);
const suggestedTime = await suggestBestTime();
setDueTime(suggestedTime);
```

### 2. Adaptive Reminders

```typescript
// Schedule notification at optimal time
const recommendation = await NotificationRTService.getOptimalSlot(
  task.category,
  task.priority,
  task.dueTime?.getTime(),
);

// Adjust notification time based on expected RT
const notifyTime = new Date(
  task.dueTime.getTime() - recommendation.estimatedOpenTime.getTime(),
);
```

### 3. Smart Snooze

```typescript
// Offer personalized snooze options
const options = await getSnoozeOptions();
// Options might be: [6min, 12min, "2:30 PM (peak focus)"]
```

### 4. Focus Time Insights

```typescript
// Show user their best productivity windows
const windows = await NotificationRTService.getFocusWindows('Work');
// Display: "You're most productive on Tue/Thu 9:00-10:00 AM"
```

## Performance Considerations

- **Offline-first**: All computation happens on-device
- **Efficient storage**: Only stores aggregated statistics, not raw events
- **Lazy loading**: Statistics loaded only when needed
- **Automatic cleanup**: Old data naturally decays via EWMA
- **Minimal overhead**: Updates take <1ms per event

## Privacy

- All data stays on device (Realm local database)
- No server communication required
- User can clear statistics anytime via `clearStats()`
- No personally identifiable information stored
- Integrated with existing Realm database

## Future Enhancements

1. **Context awareness**: Consider location, calendar events
2. **Multi-task patterns**: Learn from task sequences
3. **Seasonal adjustments**: Adapt to changing routines
4. **Cross-category learning**: Transfer knowledge between similar categories
5. **Confidence intervals**: Provide uncertainty estimates
6. **A/B testing**: Built-in experimentation framework

## Debugging

Export statistics for analysis:

```typescript
const stats = await NotificationRTService.exportStats();
console.log(JSON.stringify(stats, null, 2));
```

Clear all statistics:

```typescript
await NotificationRTService.clearStats();
```

## Mathematical Details

### Beta Distribution Update

```
α_new = α_old + w × (success ? 1 : 0)
β_new = β_old + w × (success ? 0 : 1)
P(open) = α / (α + β)
```

### Log-Normal EWMA Update

```
α = w / (weight + w)
μ_new = μ_old + α × (ln(RT) - μ_old)
σ²_new = (1-α) × (σ²_old + α × (ln(RT) - μ_old) × (ln(RT) - μ_new))
Median RT = exp(μ)
```

### Slot Scoring

```
attention = W_OPEN5 × P(open5m) + W_OPEN30 × P(open30m) + W_RT × (RT_REF / median_RT)
deadline_factor = max(0.1, 1 + slack / duration)
fatigue = min(0.3 + 0.7 × ignore_rate, 1.0)
score = priority × attention × deadline_factor × (1 - 0.6 × fatigue)
```

## Testing

The algorithm includes built-in exploration (ε-greedy) to continuously test new hypotheses and avoid local optima. This ensures the system adapts to changing user patterns over time.

---

For questions or issues, refer to the source code in:

- `src/services/NotificationRTService.ts`
- `src/types/notification-rt.types.ts`
- `src/hooks/useNotificationRT.ts`
