# RT Algorithm Quick Reference Card

## 🚀 Quick Start

```typescript
// 1. Import
import { NotificationRTService } from './services/NotificationRTService';
import { useNotificationRT } from './hooks/useNotificationRT';

// 2. Use in component
const { suggestBestTime, focusWindows } = useNotificationRT('Work');

// 3. Get suggestion
const bestTime = await suggestBestTime();
```

## 📊 Core Concepts

| Concept                | Description                                        | Range             |
| ---------------------- | -------------------------------------------------- | ----------------- |
| **RT (Reaction Time)** | Time between notification delivery and user action | 0-∞ minutes       |
| **Time Bin**           | 30-minute time slot                                | 0-47 (48 per day) |
| **P(open5m)**          | Probability of opening within 5 minutes            | 0-1               |
| **P(open30m)**         | Probability of opening within 30 minutes           | 0-1               |
| **Median RT**          | Expected reaction time (log-normal median)         | milliseconds      |
| **Confidence**         | Reliability based on sample size                   | 0-1               |

## 🎯 RT Categories

| Category    | Time Range | User Behavior      |
| ----------- | ---------- | ------------------ |
| **Quick**   | 0-2 min    | Immediate response |
| **Short**   | 2-10 min   | Prompt attention   |
| **Medium**  | 10-30 min  | Delayed check      |
| **Long**    | 30-120 min | Eventually noticed |
| **Ignored** | >120 min   | Dismissed/missed   |

## 🔧 Common Operations

### Get Optimal Notification Time

```typescript
const recommendation = await NotificationRTService.getOptimalSlot(
  'Work', // category
  'high', // priority
  dueDate.getTime(), // deadline (optional)
  30 * 60 * 1000, // duration (optional)
);

// Returns: { dow, bin, score, confidence, reason, estimatedOpenTime, channelConfig }
```

### Get Smart Snooze Options

```typescript
const options = await NotificationRTService.proposeSnoozeOptions(
  'Work', // category
  1, // day of week (0-6)
  18, // time bin (0-47)
);

// Returns: [
//   { minutes: 6, label: "6 min", reason: "When you usually check" },
//   { minutes: 12, label: "12 min", reason: "Extra time buffer" },
//   { minutes: 45, label: "2:30 PM", reason: "Your peak focus time" }
// ]
```

### Get Focus Windows

```typescript
const windows = await NotificationRTService.getFocusWindows('Work');

// Returns: Array of { category, dow, startBin, endBin, pOpen5m, medianRtMs, confidence }
```

### Log Interaction

```typescript
await NotificationRTService.logEvent({
  id: 'unique-id',
  taskId: 'task-123',
  category: 'Work',
  deliveredAt: deliveryTimestamp,
  openedAt: openTimestamp, // optional
  action: 'open', // 'open' | 'completeFromPush' | 'snooze' | 'dismiss' | 'ignore'
  dayOfWeek: 1, // 0-6
  hourBin: 18, // 0-47
  priority01: 1.0, // 0-1
  dueInMinAtDelivery: 60,
  isSilent: false,
});
```

## 🎨 React Hook Usage

```typescript
const {
  focusWindows, // Array of optimal time windows
  loading, // Loading state
  loadFocusWindows, // Refresh windows
  getOptimalSlot, // Get recommendation
  getSnoozeOptions, // Get snooze suggestions
  suggestBestTime, // Get best time for new task
} = useNotificationRT(category);
```

## 📱 UI Component

```typescript
import { FocusWindowsDisplay } from './components/FocusWindowsDisplay';

<FocusWindowsDisplay
  category="Work"
  onSelectWindow={window => {
    // Handle window selection
  }}
/>;
```

## ⚙️ Algorithm Parameters

```typescript
// Time Configuration
BIN_SIZE_MINUTES = 30        // 30-min bins
BINS_PER_DAY = 48            // 48 bins/day

// Learning Parameters
HALF_LIFE_MS = 14 days       // Recency weight decay
IGNORE_CUTOFF_MS = 120 min   // Ignore threshold
EXPLORATION_EPSILON = 0.1    // 10% exploration

// Scoring Weights
W_OPEN5 = 0.5               // Quick response weight
W_OPEN30 = 0.3              // Medium response weight
W_RT = 0.2                  // RT factor weight

// Confidence
MIN_SAMPLES = 5             // Min samples for confidence
```

## 📈 Scoring Formula

```
attention = 0.5 × P(open5m) + 0.3 × P(open30m) + 0.2 × (10min / medianRT)
deadline_factor = max(0.1, 1 + slack / duration)
fatigue = min(0.3 + 0.7 × ignore_rate, 1.0)

final_score = priority × attention × deadline_factor × (1 - 0.6 × fatigue)
```

## 🔍 Debugging

```typescript
// Export all statistics
const stats = await NotificationRTService.exportStats();
console.log(JSON.stringify(stats, null, 2));

// Clear all data
await NotificationRTService.clearStats();

// Check specific slot
const slotKey = `Work:1:18`; // Work, Monday, 9:00 AM
const slot = stats.slots[slotKey];
console.log('P(open5m):', slot.open5m_a / (slot.open5m_a + slot.open5m_b));
console.log('Median RT:', Math.exp(slot.lnRt_mean) / 60000, 'min');
```

## 🎯 Channel Configuration

| Volume     | Condition                   | Use Case            |
| ---------- | --------------------------- | ------------------- |
| **Silent** | P(open5m) < 15%             | Low engagement      |
| **Quiet**  | P(open5m) < 35%             | Moderate engagement |
| **Normal** | Default                     | Standard engagement |
| **Loud**   | P(open5m) > 50% & RT < 5min | High engagement     |

## 📊 Engagement Levels

| Level         | P(open5m) | Color       | Description          |
| ------------- | --------- | ----------- | -------------------- |
| **Excellent** | ≥70%      | Green       | Very high engagement |
| **Good**      | 50-69%    | Light Green | High engagement      |
| **Fair**      | 30-49%    | Yellow      | Moderate engagement  |
| **Low**       | <30%      | Orange      | Low engagement       |

## 🔄 Data Flow

```
User Action
    ↓
logEvent()
    ↓
Update Beta & Log-Normal
    ↓
Persist to Realm
    ↓
getOptimalSlot() uses updated stats
    ↓
Better recommendations
```

## 💾 Storage

- **Key**: `@brio_rt_stats`
- **Location**: Realm (device-local)
- **Size**: ~10-50KB typical
- **Format**: JSON with versioning
- **Privacy**: Never leaves device

## 🧪 Testing Checklist

- [ ] Initialize service
- [ ] Log sample events (10+ per slot)
- [ ] Check focus windows appear
- [ ] Verify recommendations improve
- [ ] Test snooze suggestions
- [ ] Export and inspect stats
- [ ] Clear stats and verify reset

## 📚 File Locations

```
src/
├── types/
│   └── notification-rt.types.ts      # Type definitions
├── services/
│   ├── NotificationRTService.ts      # Core algorithm
│   └── NotificationService.ts        # Integration
├── hooks/
│   └── useNotificationRT.ts          # React hook
└── components/
    └── FocusWindowsDisplay.tsx       # UI component

Documentation:
├── RT_ALGORITHM_GUIDE.md             # Full documentation
├── RT_IMPLEMENTATION_SUMMARY.md      # Overview
├── INTEGRATION_EXAMPLE.md            # Integration guide
└── RT_QUICK_REFERENCE.md             # This file
```

## 🚨 Common Pitfalls

1. **Not enough data**: Need 5+ samples per slot for confidence
2. **Wrong time bin**: Remember bins are 0-47, not hours
3. **Forgetting to log**: Must log all interactions for learning
4. **Ignoring confidence**: Check confidence before trusting suggestions
5. **Not initializing**: Call `initialize()` before using service

## ✅ Best Practices

1. **Always log interactions**: Every open, dismiss, snooze
2. **Check confidence**: Use suggestions only when confidence > 0.5
3. **Provide fallbacks**: Have default times when no data
4. **Show reasoning**: Display why a time is suggested
5. **Allow overrides**: Let users choose despite suggestions
6. **Monitor patterns**: Periodically review focus windows
7. **Respect privacy**: Never export user data off-device

## 🎓 Learning Curve

| Phase          | Samples | Behavior                           |
| -------------- | ------- | ---------------------------------- |
| **Cold Start** | 0-5     | Uses priors, explores heavily      |
| **Learning**   | 5-20    | Builds confidence, still exploring |
| **Confident**  | 20-50   | Good predictions, less exploration |
| **Mature**     | 50+     | Excellent predictions, adaptive    |

## 🔗 Related Services

- **NotificationService**: Schedules notifications using RT
- **SmartPlanningService**: Complements with completion patterns
- **AchievementService**: Can track RT-based achievements

---

**Quick Help**: See `RT_ALGORITHM_GUIDE.md` for detailed documentation
**Integration**: See `INTEGRATION_EXAMPLE.md` for step-by-step guide
**Overview**: See `RT_IMPLEMENTATION_SUMMARY.md` for complete summary
