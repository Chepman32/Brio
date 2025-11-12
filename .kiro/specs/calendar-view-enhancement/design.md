# Design Document

## Overview

This design enhances the existing CalendarView component to provide a more polished and functional day view with time-based task scheduling and an improved month view with better visual indicators. The design focuses on creating a clean, intuitive interface that matches modern calendar applications while maintaining consistency with the Brio app's existing design system.

The enhancement will modify the existing `CalendarView.tsx` component to improve the visual presentation and user experience without changing the underlying data structures or navigation patterns.

## Architecture

### Component Structure

The enhancement will work within the existing component architecture:

```
CalendarView (Enhanced)
├── Day View (Enhanced)
│   ├── Date Header (Compact)
│   ├── Day Hero Section (New)
│   │   ├── Gradient Background
│   │   ├── Large Day Name
│   │   └── Day Vibe Description
│   ├── Timeline Container
│   │   ├── Time Labels (6:00 - 23:00)
│   │   └── Task Blocks (Color-coded)
│   └── Floating Action Button (New)
├── Month View (Enhanced)
│   ├── Navigation Header (New)
│   ├── Month/Year Title
│   ├── Day Headers
│   ├── Date Grid
│   │   └── Task Indicators (Enhanced)
│   └── Bottom Navigation
└── Week View (Existing - No changes)
```

### Data Flow

1. **Task Retrieval**: Tasks are filtered by date using existing `getTasksForDate()` method
2. **Day Vibe Analysis**: Task categories and counts are analyzed to determine day character
3. **Category Mapping**: Task categories are mapped to predefined colors
4. **Time Positioning**: Tasks with `dueTime` are positioned in the timeline based on hour and minute
5. **Visual Rendering**: Components render with enhanced styling and layout

## Components and Interfaces

### 1. Enhanced Day View

#### Visual Design

- **Compact Header**: Small header showing "День: [Weekday], [Date] [Month]" in Russian format
- **Hero Section**: Large gradient block (20% screen height) with day name and vibe description
- **Timeline**: Scrollable timeline from 6:00 to 23:00 with hourly divisions
- **Task Blocks**: Rounded rectangles with category colors, showing title and time range
- **FAB**: Circular blue button with white plus icon, positioned bottom-right

#### Layout Specifications

```
┌─────────────────────────────────┐
│  День: Среда, 13 ноября         │ ← Compact Header
├─────────────────────────────────┤
│ ╔═══════════════════════════╗  │
│ ║  🌊 Gradient Background   ║  │ ← Hero Section (20% height)
│ ║                           ║  │   Blue → White gradient
│ ║      Среда                ║  │   Large day name
│ ║   Рабочая суета           ║  │   Day vibe description
│ ╚═══════════════════════════╝  │
├─────────────────────────────────┤
│ 12:00 ┌──────────────────────┐ │
│       │ Здоровье             │ │ ← Task Block (green)
│       │ 12:00 – 12:45        │ │
│       └──────────────────────┘ │
│ 15:00 ┌──────────────────────┐ │
│       │ Встреча              │ │ ← Task Block (orange)
│       │ 15:00 – 16:00        │ │
│       └──────────────────────┘ │
│                                  │
│                          ┌───┐  │
│                          │ + │  │ ← FAB
│                          └───┘  │
└─────────────────────────────────┘
```

#### Styling Constants

```typescript
const DAY_VIEW_STYLES = {
  compactHeader: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
  heroSection: {
    height: '20%', // 20% of screen height
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 24,
    justifyContent: 'center',
  },
  heroGradient: {
    colors: ['#6B9EFF', '#FFFFFF'], // Blue to white
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
  dayName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dayVibe: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    marginTop: 8,
    opacity: 0.8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#8E8E93',
    width: 60,
  },
  taskBlock: {
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  taskTime: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
};
```

### 2. Enhanced Month View

#### Visual Design

- **Navigation Header**: Back arrow (left), Plus button (right)
- **Month Title**: Large, bold month name and year
- **Day Headers**: Abbreviated day names (Пн, Вт, Ср, etc.)
- **Date Grid**: 7x5 or 7x6 grid with dates
- **Task Indicators**: Small colored dots beneath dates with tasks
- **Current Date**: Blue circular highlight

#### Layout Specifications

```
┌─────────────────────────────────┐
│ ←          Ноябрь 2025        + │ ← Navigation Header
├─────────────────────────────────┤
│ Пн  Вт  Ср  Чт  Пт  Сб  Вс     │ ← Day Headers
├─────────────────────────────────┤
│     1   2   3   4   5           │
│         •       •               │ ← Task indicators
│ 6   7   8   9   10  11  12      │
│                                  │
│ 13  14  15 (13) 17  18  19      │ ← Current date (circled)
│ •   •                           │
│ 20  21  22  23  24  25  26      │
│                                  │
│ 27  28  29  30  31              │
│     •   •                       │
└─────────────────────────────────┘
```

#### Styling Constants

```typescript
const MONTH_VIEW_STYLES = {
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  dateCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDate: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
  },
  taskIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
};
```

### 3. Category Color Mapping

#### Color Palette

```typescript
const CATEGORY_COLORS = {
  // Primary categories
  Work: '#6B9EFF', // Blue
  Health: '#7BC67E', // Green
  Fitness: '#7BC67E', // Green
  Nutrition: '#7BC67E', // Green
  Meetings: '#FF9F6B', // Orange
  Calls: '#FF9F6B', // Orange

  // Secondary categories
  Personal: '#A78BFA', // Purple
  Family: '#F472B6', // Pink
  Study: '#FBBF24', // Yellow
  Reading: '#FBBF24', // Yellow
  Finance: '#34D399', // Teal
  Shopping: '#60A5FA', // Light Blue

  // Default
  default: '#6366F1', // Indigo
};
```

### 4. Day Vibe Analysis Logic

#### Vibe Determination Algorithm

```typescript
interface DayVibeResult {
  vibe: string;
  gradient: string[];
}

const analyzeDayVibe = (tasks: TaskType[]): DayVibeResult => {
  if (tasks.length === 0) {
    return {
      vibe: 'Свободный день',
      gradient: ['#A78BFA', '#FFFFFF'], // Purple to white
    };
  }

  // Count tasks by category type
  const workCategories = ['Work', 'Meetings', 'Calls', 'Email'];
  const relaxCategories = [
    'Personal',
    'Shopping',
    'Entertainment / Movies / Series',
  ];
  const healthCategories = ['Health', 'Fitness', 'Nutrition'];

  const workCount = tasks.filter(t =>
    workCategories.includes(t.category || ''),
  ).length;
  const relaxCount = tasks.filter(t =>
    relaxCategories.includes(t.category || ''),
  ).length;
  const healthCount = tasks.filter(t =>
    healthCategories.includes(t.category || ''),
  ).length;

  // Determine vibe based on dominant category
  if (workCount > tasks.length * 0.6) {
    return {
      vibe: 'Рабочая суета',
      gradient: ['#6B9EFF', '#FFFFFF'], // Blue to white
    };
  } else if (healthCount > tasks.length * 0.5) {
    return {
      vibe: 'День здоровья',
      gradient: ['#7BC67E', '#FFFFFF'], // Green to white
    };
  } else if (relaxCount > tasks.length * 0.5) {
    return {
      vibe: 'Спокойный день',
      gradient: ['#60A5FA', '#FFFFFF'], // Light blue to white
    };
  } else if (tasks.length > 5) {
    return {
      vibe: 'Насыщенный день',
      gradient: ['#FF9F6B', '#FFFFFF'], // Orange to white
    };
  } else {
    return {
      vibe: 'Обычный день',
      gradient: ['#A78BFA', '#FFFFFF'], // Purple to white
    };
  }
};
```

#### Vibe Options

| Vibe            | Condition          | Gradient           |
| --------------- | ------------------ | ------------------ |
| Свободный день  | No tasks           | Purple → White     |
| Рабочая суета   | >60% work tasks    | Blue → White       |
| День здоровья   | >50% health tasks  | Green → White      |
| Спокойный день  | >50% leisure tasks | Light Blue → White |
| Насыщенный день | >5 tasks mixed     | Orange → White     |
| Обычный день    | Default            | Purple → White     |

### 5. Floating Action Button

#### Component Specification

```typescript
interface FABProps {
  onPress: () => void;
  visible: boolean;
}

const FAB_STYLES = {
  container: {
    position: 'absolute',
    bottom: 80, // Above bottom navigation
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  icon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
};
```

## Data Models

No changes to existing data models are required. The enhancement uses existing Task schema:

```typescript
interface TaskType {
  _id: string;
  title: string;
  dueDate: Date;
  dueTime?: Date; // Used for timeline positioning
  category?: string; // Used for color mapping
  // ... other fields
}
```

## Error Handling

### Edge Cases

1. **Tasks without time**: Display at top of day view or show in separate "All Day" section
2. **Overlapping tasks**: Stack vertically with slight offset
3. **Multiple tasks on same date**: Show first task's color as indicator in month view
4. **Long task titles**: Truncate with ellipsis after 2 lines
5. **Missing category**: Use default color (#6366F1)

### Validation

```typescript
const getTaskColor = (category?: string): string => {
  if (!category) return CATEGORY_COLORS.default;
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
};

const formatTimeRange = (startTime?: Date, duration: number = 60): string => {
  if (!startTime) return '';
  const endTime = new Date(startTime.getTime() + duration * 60000);
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
};

const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};
```

## Testing Strategy

### Unit Tests

1. **Color Mapping Tests**

   - Test category to color mapping
   - Test default color fallback
   - Test case-insensitive category matching

2. **Time Formatting Tests**

   - Test time range formatting
   - Test 24-hour format
   - Test edge cases (midnight, noon)

3. **Date Filtering Tests**
   - Test task filtering by date
   - Test task indicator logic
   - Test current date detection

### Integration Tests

1. **Day View Rendering**

   - Test task block positioning
   - Test timeline scrolling
   - Test FAB visibility and interaction

2. **Month View Rendering**

   - Test date grid generation
   - Test task indicator display
   - Test navigation between months

3. **User Interactions**
   - Test task selection
   - Test FAB press
   - Test date selection in month view

### Visual Regression Tests

1. Compare day view screenshots with design mockups
2. Compare month view screenshots with design mockups
3. Test on different screen sizes (iPhone SE, iPhone 14 Pro Max)
4. Test with varying numbers of tasks (0, 1, 5, 10+)

## Implementation Notes

### Performance Considerations

1. **Memoization**: Use `React.memo` for task blocks to prevent unnecessary re-renders
2. **Virtualization**: Consider `FlatList` for day view if performance issues arise with many tasks
3. **Lazy Loading**: Load only visible month's tasks in month view
4. **Gesture Optimization**: Use `useAnimatedGestureHandler` for smooth swipe gestures

### Accessibility

1. **Screen Reader Support**: Add accessibility labels to all interactive elements
2. **Touch Targets**: Ensure minimum 44x44pt touch targets for all buttons
3. **Color Contrast**: Ensure text on colored backgrounds meets WCAG AA standards
4. **Focus Management**: Proper focus order for keyboard navigation

### Localization

The design includes Russian text in the mockups. Implement i18n support:

```typescript
const TRANSLATIONS = {
  en: {
    day: 'Day',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  ru: {
    day: 'День',
    weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  },
};
```

## Migration Path

Since this is an enhancement of existing components:

1. **Phase 1**: Update day view styling and add FAB
2. **Phase 2**: Enhance month view with navigation header and improved indicators
3. **Phase 3**: Implement category color mapping
4. **Phase 4**: Add localization support
5. **Phase 5**: Performance optimization and testing

No database migrations or breaking changes are required.
