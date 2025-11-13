# RT Algorithm System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│  TaskCreationModal  │  FocusWindowsDisplay  │  SnoozeDialog    │
│  - RT suggestions   │  - Optimal windows    │  - Smart options │
│  - Best time        │  - Engagement metrics │  - Reasoning     │
└──────────────┬──────────────────┬────────────────────┬──────────┘
               │                  │                    │
               ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         REACT HOOKS                             │
├─────────────────────────────────────────────────────────────────┤
│  useNotificationRT          │  useNotificationTracking          │
│  - suggestBestTime()        │  - logInteraction()               │
│  - getOptimalSlot()         │                                   │
│  - getSnoozeOptions()       │                                   │
│  - focusWindows             │                                   │
└──────────────┬──────────────────────────────┬──────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  NotificationService        │  NotificationRTService            │
│  - scheduleNotification()   │  - getOptimalSlot()               │
│  - getSmartSnoozeOptions()  │  - proposeSnoozeOptions()         │
│  - logNotificationInteraction() - getFocusWindows()             │
│                             │  - logEvent()                     │
│                             │  - updateStats()                  │
└──────────────┬──────────────────────────────┬──────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  Realm (@brio_rt_stats)                                  │
│  - SlotStats (per category × day × time)                        │
│  - Beta distributions (open probabilities)                      │
│  - Log-normal distributions (reaction times)                    │
│  - Global statistics                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Notification Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TASK CREATION                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        User creates task with category "Work"
                              │
                              ▼
        NotificationRTService.getOptimalSlot("Work", "high")
                              │
                              ▼
        Analyze 144 candidate slots (72 hours × 2 bins/hour)
                              │
                              ▼
        Score each slot: attention × deadline × (1 - fatigue)
                              │
                              ▼
        Return best slot with confidence & reasoning
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. NOTIFICATION SCHEDULING                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        NotificationService.scheduleNotification(task)
                              │
                              ▼
        Adjust time for expected RT: notify_time = due_time - median_RT
                              │
                              ▼
        Apply channel config (silent/quiet/normal/loud)
                              │
                              ▼
        Schedule with PushNotificationIOS
                              │
                              ▼
        Track delivery: deliveryTracking.set(taskId, timestamp)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. USER INTERACTION                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        User opens notification (RT = open_time - delivery_time)
                              │
                              ▼
        NotificationService.logNotificationInteraction()
                              │
                              ▼
        NotificationRTService.logEvent({
          deliveredAt, openedAt, action: "open",
          category, dayOfWeek, hourBin, priority
        })
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. LEARNING UPDATE                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Get slot: slots["Work:1:18"] (Work, Monday, 9:00 AM)
                              │
                              ▼
        Calculate recency weight: w = exp(-age / 14_days)
                              │
                              ▼
        Update Beta distributions:
          open5m_a += w × (RT < 5min ? 1 : 0)
          open5m_b += w × (RT < 5min ? 0 : 1)
                              │
                              ▼
        Update Log-normal distribution (EWMA):
          μ_new = μ_old + α × (ln(RT) - μ_old)
          σ²_new = (1-α) × (σ²_old + α × (ln(RT) - μ_old)²)
                              │
                              ▼
        Update counters: delivered++, opened++
                              │
                              ▼
        Persist to Realm
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. IMPROVED RECOMMENDATIONS                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Next task creation uses updated statistics
                              │
                              ▼
        Better slot scores → Better timing → Higher engagement
```

## Statistical Models

```
┌─────────────────────────────────────────────────────────────────┐
│ BETA DISTRIBUTION (Open Probability)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  P(open within T) = α / (α + β)                                │
│                                                                 │
│  Prior: Beta(2, 2)  [slightly optimistic]                      │
│                                                                 │
│  Update:                                                        │
│    α_new = α_old + w × (success ? 1 : 0)                       │
│    β_new = β_old + w × (success ? 0 : 1)                       │
│                                                                 │
│  Where:                                                         │
│    w = exp(-age / 14_days)  [recency weight]                   │
│    success = (RT < threshold)                                   │
│                                                                 │
│  Thresholds:                                                    │
│    - 5 minutes  (quick response)                               │
│    - 30 minutes (medium response)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LOG-NORMAL DISTRIBUTION (Reaction Time)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RT ~ LogNormal(μ, σ²)                                         │
│                                                                 │
│  Median RT = exp(μ)                                            │
│  Mean RT   = exp(μ + σ²/2)                                     │
│                                                                 │
│  Prior: μ = ln(15 min), σ² = 0.64                             │
│                                                                 │
│  EWMA Update:                                                   │
│    α = w / (weight + w)                                        │
│    μ_new = μ_old + α × (ln(RT) - μ_old)                       │
│    σ²_new = (1-α) × (σ²_old + α × (ln(RT) - μ_old) ×         │
│                                   (ln(RT) - μ_new))            │
│                                                                 │
│  Why log-normal?                                                │
│    - RT is always positive                                     │
│    - Right-skewed distribution                                 │
│    - Multiplicative effects                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Slot Scoring Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│ MULTI-FACTOR SLOT SCORING                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ATTENTION SCORE (0-1)                                       │
│     ┌────────────────────────────────────────────────────┐    │
│     │ attention = 0.5 × P(open5m)  [quick response]     │    │
│     │           + 0.3 × P(open30m) [medium response]    │    │
│     │           + 0.2 × (10min / median_RT) [RT factor] │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                 │
│  2. DEADLINE FACTOR (0.1-1.0)                                   │
│     ┌────────────────────────────────────────────────────┐    │
│     │ slack = deadline - (notify_time + median_RT + duration) │
│     │                                                     │    │
│     │ if slack >= 0:                                     │    │
│     │   deadline_factor = 1.0                            │    │
│     │ else:                                               │    │
│     │   deadline_factor = max(0.1, 1 + slack/duration)  │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                 │
│  3. FATIGUE PENALTY (0.3-1.0)                                   │
│     ┌────────────────────────────────────────────────────┐    │
│     │ ignore_rate = ignored / delivered                  │    │
│     │ fatigue = min(0.3 + 0.7 × ignore_rate, 1.0)       │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                 │
│  4. FINAL SCORE                                                 │
│     ┌────────────────────────────────────────────────────┐    │
│     │ score = priority × attention × deadline_factor ×   │    │
│     │         (1 - 0.6 × fatigue)                        │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                 │
│  5. EPSILON-GREEDY SELECTION                                    │
│     ┌────────────────────────────────────────────────────┐    │
│     │ if random() < 0.1:                                 │    │
│     │   select from top-5 randomly [exploration]        │    │
│     │ else:                                               │    │
│     │   select highest score [exploitation]             │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Time Bin System

```
┌─────────────────────────────────────────────────────────────────┐
│ 30-MINUTE TIME BINS (48 per day)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bin  │  Time Range   │  Example Use Case                      │
│  ────┼───────────────┼────────────────────────────────────    │
│   0  │  00:00-00:30  │  Late night tasks                      │
│   1  │  00:30-01:00  │                                        │
│  ... │      ...      │                                        │
│  14  │  07:00-07:30  │  Morning routine                       │
│  15  │  07:30-08:00  │                                        │
│  16  │  08:00-08:30  │  Commute time                          │
│  17  │  08:30-09:00  │                                        │
│  18  │  09:00-09:30  │  Work start (high engagement)          │
│  19  │  09:30-10:00  │                                        │
│  ... │      ...      │                                        │
│  24  │  12:00-12:30  │  Lunch break                           │
│  25  │  12:30-13:00  │                                        │
│  ... │      ...      │                                        │
│  34  │  17:00-17:30  │  Work end                              │
│  35  │  17:30-18:00  │                                        │
│  36  │  18:00-18:30  │  Evening (high engagement)             │
│  37  │  18:30-19:00  │                                        │
│  ... │      ...      │                                        │
│  47  │  23:30-00:00  │  Before sleep                          │
│                                                                 │
│  Conversion:                                                    │
│    bin = floor((hours × 60 + minutes) / 30)                   │
│    time = (bin × 30) minutes from midnight                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Storage Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Realm: @brio_rt_stats                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  {                                                              │
│    version: 1,                                                  │
│    lastCleanupAt: 1699876543210,                               │
│                                                                 │
│    globalStats: {                                               │
│      open5m_a: 12.5,                                           │
│      open5m_b: 8.3,                                            │
│      open30m_a: 18.2,                                          │
│      open30m_b: 5.1,                                           │
│      lnRt_mean: 8.517,  // ln(5000ms) ≈ 8.517                 │
│      lnRt_var: 0.64,                                           │
│      weight: 23.4,                                             │
│      delivered: 45,                                            │
│      opened: 32,                                               │
│      ignored: 13,                                              │
│      lastUpdateAt: 1699876543210                               │
│    },                                                           │
│                                                                 │
│    slots: {                                                     │
│      "Work:1:18": {  // Work, Monday, 9:00 AM                  │
│        open5m_a: 8.2,                                          │
│        open5m_b: 3.1,                                          │
│        open30m_a: 10.5,                                        │
│        open30m_b: 1.8,                                         │
│        lnRt_mean: 7.824,  // ln(2500ms) ≈ 7.824               │
│        lnRt_var: 0.45,                                         │
│        weight: 12.3,                                           │
│        delivered: 15,                                          │
│        opened: 12,                                             │
│        ignored: 3,                                             │
│        lastUpdateAt: 1699876543210                             │
│      },                                                         │
│      "Personal:6:36": { ... },  // Personal, Saturday, 6:00 PM │
│      "Fitness:2:14": { ... },   // Fitness, Tuesday, 7:00 AM   │
│      ...                                                        │
│    }                                                            │
│  }                                                              │
│                                                                 │
│  Size: ~10-50 KB for typical usage                            │
│  Growth: O(categories × 7 days × 48 bins) = O(336 × categories)│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App
 │
 ├─ NotificationService (initialized)
 │   └─ NotificationRTService (initialized)
 │
 ├─ TaskCreationModal
 │   ├─ useNotificationRT(category)
 │   │   ├─ focusWindows
 │   │   ├─ suggestBestTime()
 │   │   └─ getOptimalSlot()
 │   │
 │   └─ RT Suggestion Card
 │       ├─ Confidence Badge
 │       ├─ Reasoning Text
 │       └─ Apply Button
 │
 ├─ TaskDetailModal
 │   └─ Smart Snooze
 │       └─ getSmartSnoozeOptions()
 │           ├─ Option 1: Median RT
 │           ├─ Option 2: 2× Median
 │           └─ Option 3: Next Focus Window
 │
 ├─ SettingsScreen
 │   └─ FocusWindowsDisplay
 │       ├─ Category Selector
 │       └─ Window Cards
 │           ├─ Day & Time
 │           ├─ Engagement Badge
 │           ├─ Quick Response %
 │           ├─ Avg Response Time
 │           └─ Confidence Level
 │
 └─ NotificationHandler
     └─ logNotificationInteraction()
         ├─ On Open
         ├─ On Complete
         ├─ On Snooze
         └─ On Dismiss
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│ OPERATION PERFORMANCE                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Operation                    │ Time      │ Complexity          │
│  ────────────────────────────┼───────────┼─────────────────   │
│  initialize()                 │ <10ms     │ O(1)               │
│  logEvent()                   │ <1ms      │ O(1)               │
│  getOptimalSlot()             │ <50ms     │ O(n) n=144 slots   │
│  proposeSnoozeOptions()       │ <20ms     │ O(n) n=96 slots    │
│  getFocusWindows()            │ <30ms     │ O(n) n=336 slots   │
│  persist()                    │ <5ms      │ O(1)               │
│                                                                 │
│  Memory Usage:                                                  │
│    - Service: ~100 KB                                          │
│    - Storage: ~10-50 KB                                        │
│    - Per slot: ~200 bytes                                      │
│                                                                 │
│  Network: None (100% offline)                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This architecture provides a robust, scalable, and privacy-preserving notification optimization system that learns and adapts to each user's unique patterns.
