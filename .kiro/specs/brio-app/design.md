# Design Document

## Overview

Brio is a React Native application that provides intelligent task management with a gesture-driven interface and rich animations. The architecture follows an offline-first approach with all data stored locally using Realm database. The UI leverages React Native Reanimated v3 and React Native Skia for high-performance animations running at 60fps on the UI thread.

The application is structured around four main screens (Today, Plan, Achievements, Settings) accessible via bottom tab navigation and horizontal swipe gestures. All interactions prioritize natural touch gestures processed by React Native Gesture Handler for native-level performance.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (React Native Components + Gesture Handler + Skia)     │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│                    Business Logic Layer                  │
│  (Task Management, Smart Planning, Achievement System)   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│                    Data Layer                            │
│              (Realm Database + Local Storage)            │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Framework**: React Native with TypeScript
- **Database**: Realm for offline-first local storage
- **Gestures**: React Native Gesture Handler
- **Animations**: React Native Reanimated v3 + React Native Skia
- **Icons**: react-native-vector-icons
- **Notifications**: @react-native-community/push-notification-ios
- **IAP**: react-native-iap (boilerplate only)

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── TaskCard.tsx
│   ├── FloatingActionButton.tsx
│   ├── AnimatedSplash.tsx
│   └── ...
├── screens/            # Main screen components
│   ├── TodayScreen.tsx
│   ├── PlannerScreen.tsx
│   ├── AchievementsScreen.tsx
│   └── SettingsScreen.tsx
├── navigation/         # Navigation configuration
│   └── AppNavigator.tsx
├── database/           # Realm schemas and operations
│   ├── schemas/
│   │   ├── Task.ts
│   │   ├── Achievement.ts
│   │   └── Settings.ts
│   └── operations/
│       ├── taskOperations.ts
│       └── achievementOperations.ts
├── services/           # Business logic services
│   ├── SmartPlanningService.ts
│   ├── AchievementService.ts
│   └── NotificationService.ts
├── hooks/              # Custom React hooks
│   ├── useGestures.ts
│   ├── useAnimations.ts
│   └── useTasks.ts
├── utils/              # Utility functions
│   ├── dateHelpers.ts
│   └── constants.ts
└── types/              # TypeScript type definitions
    └── index.ts
```

## Components and Interfaces

### Data Models

#### Task Schema (Realm)

```typescript
interface Task {
  _id: string; // UUID
  title: string;
  notes?: string;
  dueDate: Date;
  dueTime?: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  snoozedUntil?: Date;
}
```

#### Achievement Schema (Realm)

```typescript
interface Achievement {
  _id: string;
  type: 'streak' | 'milestone' | 'special';
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  target: number;
  iconName: string;
}
```

#### UserStats Schema (Realm)

```typescript
interface UserStats {
  _id: string;
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  lastActiveDate: Date;
  dailyCompletionPattern: { [hour: string]: number };
  weeklyCompletionPattern: { [day: string]: number };
}
```

#### Settings Schema (Realm)

```typescript
interface Settings {
  _id: string;
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  defaultReminderTime: number; // minutes before due time
  onboardingCompleted: boolean;
}
```

### Core Components

#### TaskCard Component

Displays individual task with swipe gestures for completion and snoozing.

**Props:**

```typescript
interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onPress: (taskId: string) => void;
  onLongPress: (taskId: string) => void;
}
```

**Gestures:**

- Swipe right: Complete task (triggers spring animation)
- Swipe left: Snooze task (triggers slide animation)
- Tap: Open task details
- Long press: Enable drag mode

#### FloatingActionButton Component

Animated FAB for adding new tasks.

**Props:**

```typescript
interface FABProps {
  onPress: () => void;
}
```

**Animation:**

- Scale animation on press
- Ripple effect using Skia Canvas

#### AnimatedSplash Component

Splash screen with logo assembly animation.

**Animation Sequence:**

1. Logo pieces fly in from edges (spring physics)
2. Pieces assemble with rotation
3. Particle burst effect (Skia)
4. Fade to main screen

#### TaskListView Component

Scrollable list of tasks with gesture support.

**Props:**

```typescript
interface TaskListViewProps {
  tasks: Task[];
  onTaskComplete: (taskId: string) => void;
  onTaskSnooze: (taskId: string) => void;
  onTaskPress: (taskId: string) => void;
  onReorder: (taskIds: string[]) => void;
}
```

#### CalendarView Component

Interactive calendar with pinch-zoom and swipe navigation.

**Props:**

```typescript
interface CalendarViewProps {
  mode: 'day' | 'week' | 'month';
  selectedDate: Date;
  tasks: Task[];
  onDateSelect: (date: Date) => void;
  onModeChange: (mode: 'day' | 'week' | 'month') => void;
}
```

**Gestures:**

- Horizontal swipe: Navigate between periods
- Pinch: Zoom between modes
- Tap: Select date

### Services

#### SmartPlanningService

Analyzes user patterns and suggests task scheduling.

**Interface:**

```typescript
interface SmartPlanningService {
  analyzeCompletionPatterns(): void;
  suggestTaskTime(task: Task): Date;
  updateUserStats(completedTask: Task): void;
  getOptimalSchedulingTime(): number; // hour of day
}
```

**Algorithm:**

- Track completion times in UserStats
- Calculate frequency distribution by hour and day
- Suggest times based on highest frequency
- Adapt over time with weighted moving average

#### AchievementService

Manages achievement unlocking and streak tracking.

**Interface:**

```typescript
interface AchievementService {
  checkAchievements(): Achievement[];
  updateStreak(): void;
  unlockAchievement(achievementId: string): void;
  getProgress(achievementId: string): number;
}
```

**Achievement Types:**

- Daily streak (3, 7, 14, 30, 100 days)
- Task milestones (10, 50, 100, 500 tasks)
- Special badges (first task, perfect week, etc.)

#### NotificationService

Schedules and manages local notifications.

**Interface:**

```typescript
interface NotificationService {
  scheduleNotification(task: Task): void;
  cancelNotification(taskId: string): void;
  updateNotification(task: Task): void;
  requestPermissions(): Promise<boolean>;
}
```

### Navigation Structure

```
AppNavigator (Stack)
├── SplashScreen
├── OnboardingScreen (conditional)
└── MainTabs (Bottom Tabs)
    ├── TodayScreen
    ├── PlannerScreen
    ├── AchievementsScreen
    └── SettingsScreen
```

**Gesture Navigation:**

- Horizontal swipe on any main screen cycles through tabs
- Left edge swipe opens sidebar drawer
- All transitions use Reanimated spring animations

## Data Flow

### Task Creation Flow

```
User taps FAB
  → TaskCreationModal slides up (Reanimated)
  → User fills form
  → User saves
  → Validate input
  → Save to Realm
  → Schedule notification (if due time set)
  → Update UserStats
  → Animate task card onto list
  → Check achievements
```

### Task Completion Flow

```
User swipes right on TaskCard
  → Gesture Handler detects swipe
  → Animate card off-screen (Reanimated)
  → Update task.completed in Realm
  → Cancel notification
  → Update UserStats
  → Update streak
  → Check achievements
  → Show confetti if achievement unlocked (Skia)
```

### Smart Planning Flow

```
Background task runs daily
  → Load UserStats from Realm
  → Analyze completion patterns
  → Calculate optimal scheduling times
  → Update suggestions in UserStats
  → When user creates task without time
    → Suggest optimal time based on patterns
```

## Animation Strategy

### Animation Performance

All animations run on UI thread using Reanimated v3 worklets:

```typescript
const animatedStyle = useAnimatedStyle(() => {
  return {
    transform: [
      { translateX: withSpring(translateX.value) },
      { scale: withSpring(scale.value) },
    ],
  };
});
```

### Skia Integration

Complex visual effects use Skia Canvas:

```typescript
<Canvas style={styles.canvas}>
  <Group>
    <Circle cx={x} cy={y} r={radius} color="rgba(255,100,100,0.5)" />
    <Blur blur={10} />
  </Group>
</Canvas>
```

### Animation Catalog

- **Task completion**: Slide right + fade out (300ms spring)
- **Task snooze**: Slide left + fade out (300ms spring)
- **Screen transitions**: Horizontal slide (400ms spring)
- **Modal appearance**: Slide up from bottom (350ms spring with bounce)
- **FAB press**: Scale 0.9 → 1.0 (200ms spring)
- **Achievement unlock**: Scale burst + confetti particles (1000ms)
- **Splash logo**: Piece assembly with rotation (2000ms spring)

## Error Handling

### Database Errors

```typescript
try {
  realm.write(() => {
    realm.create('Task', taskData);
  });
} catch (error) {
  console.error('Failed to create task:', error);
  showErrorToast('Unable to save task. Please try again.');
}
```

### Notification Errors

```typescript
try {
  await NotificationService.scheduleNotification(task);
} catch (error) {
  console.warn('Notification scheduling failed:', error);
  // Continue without notification - non-critical
}
```

### Gesture Conflicts

Use `simultaneousHandlers` and `waitFor` to manage gesture priorities:

```typescript
<PanGestureHandler onGestureEvent={onPan} simultaneousHandlers={scrollRef}>
  <ScrollView ref={scrollRef}>{/* content */}</ScrollView>
</PanGestureHandler>
```

## Testing Strategy

### Unit Tests

- Database operations (CRUD for all schemas)
- SmartPlanningService algorithm logic
- AchievementService unlock conditions
- Date utility functions
- Validation functions

### Component Tests

- TaskCard gesture interactions
- CalendarView date selection
- TaskCreationModal form validation
- Achievement badge display

### Integration Tests

- Complete task creation flow
- Task completion with achievement unlock
- Streak tracking across multiple days
- Notification scheduling and cancellation

### Performance Tests

- Animation frame rate monitoring (target: 60fps)
- Database query performance (target: <100ms)
- List scrolling with 1000+ tasks
- Memory usage during extended use

## Security Considerations

- All data stored locally with Realm encryption enabled
- No network requests for core functionality
- User data never leaves device
- Notification content sanitized to prevent injection
- IAP receipt validation (when implemented)

## Accessibility

- All interactive elements have minimum 44x44pt touch targets
- Vector icons scale with system font size
- High contrast mode support
- VoiceOver labels for all UI elements
- Gesture alternatives for critical actions (e.g., buttons for swipe actions)

## Performance Optimization

- Lazy loading for large task lists (FlatList with windowSize)
- Memoization of expensive computations (React.memo, useMemo)
- Debounced search and filter operations
- Realm query optimization with indexed fields
- Image caching for remote assets
- Animation worklets to avoid JS thread blocking
