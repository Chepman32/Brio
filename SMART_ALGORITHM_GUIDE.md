# Brio Smart Planning Algorithm - Technical Guide

## Overview

The Smart Planning Algorithm is the core intelligence of Brio, providing AI-like task scheduling suggestions based on learned user behavior patterns. It runs entirely on-device with no network requirements.

## Architecture

```
User Completes Task
       ↓
Update Patterns (statsOperations)
       ↓
Analyze Patterns (SmartPlanningService)
       ↓
Generate Suggestions
       ↓
Display to User with Confidence Score
```

## Data Collection

### What We Track

1. **Completion Time**: Hour of day when task was completed
2. **Completion Day**: Day of week (0-6, Sunday-Saturday)
3. **Task Priority**: Low, medium, or high
4. **Total Completions**: Running count of all completed tasks
5. **Current Streak**: Consecutive days with completions
6. **Longest Streak**: Best streak achieved

### Storage Format

```typescript
UserStats {
  dailyCompletionPattern: {
    "9": 15,   // 15 tasks completed at 9am
    "14": 8,   // 8 tasks completed at 2pm
    "18": 12   // 12 tasks completed at 6pm
  },
  weeklyCompletionPattern: {
    "1": 20,   // 20 tasks on Monday
    "3": 15,   // 15 tasks on Wednesday
    "5": 18    // 18 tasks on Friday
  }
}
```

## Algorithm Components

### 1. Pattern Analysis

**Purpose**: Identify user's productivity patterns

**Process**:

```typescript
analyzeCompletionPatterns() {
  1. Load UserStats from database
  2. Check if enough data (min 5 completions)
  3. Find peak hours (top 3 most productive hours)
  4. Find productive days (top 3 most productive days)
  5. Calculate pattern strength
  6. Return analysis results
}
```

**Output**:

```javascript
{
  totalCompletions: 45,
  peakHours: [
    { hour: 9, count: 15 },
    { hour: 18, count: 12 },
    { hour: 14, count: 8 }
  ],
  productiveDays: [
    { day: 1, count: 20 },  // Monday
    { day: 5, count: 18 },  // Friday
    { day: 3, count: 15 }   // Wednesday
  ],
  currentStreak: 7
}
```

### 2. Time Suggestion

**Purpose**: Suggest optimal time for a new task

**Algorithm**:

```typescript
suggestTaskTime(task: TaskInput): Date {
  // Step 1: Check data availability
  if (totalCompletions < 5) {
    return getDefaultSuggestion(task);
  }

  // Step 2: Get optimal hour
  const optimalHour = getOptimalSchedulingTime();
  // Returns hour with highest completion count

  // Step 3: Get optimal day
  const optimalDay = getOptimalDay(task, weeklyPattern);
  // Considers task priority and productive days

  // Step 4: Create suggested date
  const suggestedDate = new Date();
  suggestedDate.setDate(suggestedDate.getDate() + optimalDay);
  suggestedDate.setHours(optimalHour, 0, 0, 0);

  // Step 5: Adjust for priority
  return adjustForPriority(suggestedDate, task.priority);
}
```

**Priority Adjustments**:

- **High Priority**: If suggestion > 24h away, bring to 4h from now
- **Medium Priority**: Use suggested time as-is
- **Low Priority**: If suggestion < 24h away, push to +2 days

### 3. Confidence Scoring

**Purpose**: Indicate reliability of suggestion

**Formula**:

```typescript
predictCompletionProbability(date: Date): number {
  const hour = date.getHours();
  const day = date.getDay();

  // Calculate hour score (0-1)
  const hourCompletions = dailyPattern[hour] || 0;
  const maxHourCompletions = max(dailyPattern);
  const hourScore = hourCompletions / maxHourCompletions;

  // Calculate day score (0-1)
  const dayCompletions = weeklyPattern[day] || 0;
  const maxDayCompletions = max(weeklyPattern);
  const dayScore = dayCompletions / maxDayCompletions;

  // Weighted combination
  const confidence = (hourScore * 0.6) + (dayScore * 0.4);

  return clamp(confidence, 0.1, 0.9);
}
```

**Confidence Levels**:

- **90%+**: Very strong pattern match
- **70-89%**: Strong pattern match
- **60-69%**: Moderate pattern match
- **40-59%**: Weak pattern match
- **<40%**: Insufficient data

### 4. Alternative Suggestions

**Purpose**: Provide backup options

**Generation**:

```typescript
generateAlternatives(task, primarySuggestion) {
  const alternatives = [];

  // Alternative 1: 3 hours earlier
  const earlier = new Date(primarySuggestion);
  earlier.setHours(earlier.getHours() - 3);
  if (earlier > now) {
    alternatives.push({
      time: earlier,
      confidence: predictCompletionProbability(earlier),
      reason: 'Earlier time slot'
    });
  }

  // Alternative 2: 3 hours later
  const later = new Date(primarySuggestion);
  later.setHours(later.getHours() + 3);
  alternatives.push({
    time: later,
    confidence: predictCompletionProbability(later),
    reason: 'Later time slot'
  });

  // Alternative 3: Next day same time
  const nextDay = new Date(primarySuggestion);
  nextDay.setDate(nextDay.getDate() + 1);
  alternatives.push({
    time: nextDay,
    confidence: predictCompletionProbability(nextDay),
    reason: 'Next day'
  });

  return alternatives
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2);
}
```

### 5. Reasoning Engine

**Purpose**: Explain why a time was suggested

**Logic**:

```typescript
generateSuggestionReason(suggestedTime, task) {
  const hour = suggestedTime.getHours();
  const stats = getStats();

  if (stats.totalTasksCompleted < 5) {
    return `Based on ${task.priority} priority`;
  }

  const timeOfDay =
    hour < 12 ? 'morning' :
    hour < 17 ? 'afternoon' :
    'evening';

  return `You're most productive in the ${timeOfDay} based on your completion history`;
}
```

## Learning Process

### Initial State (0-4 completions)

- Uses default suggestions based on priority
- High: 2 hours from now
- Medium: Tomorrow at 9am
- Low: 2 days from now at 2pm

### Learning Phase (5-20 completions)

- Begins pattern recognition
- Suggestions based on limited data
- Confidence scores typically 40-60%
- Still uses some default logic

### Mature State (20+ completions)

- Strong pattern recognition
- High confidence suggestions (70-90%)
- Accurate time-of-day predictions
- Reliable day-of-week patterns

### Continuous Adaptation

- Every completion updates patterns
- Learning rate: 0.3 (30% weight to new data)
- Balances stability with adaptation
- Prevents over-fitting to recent behavior

## Example Scenarios

### Scenario 1: New User

**Input**: Create medium priority task
**Data**: 0 completions
**Output**:

```javascript
{
  suggestedTime: "Tomorrow at 9:00 AM",
  confidence: 50%,
  reason: "Based on medium priority",
  alternatives: [
    { time: "Tomorrow at 2:00 PM", confidence: 50% },
    { time: "Day after tomorrow at 9:00 AM", confidence: 50% }
  ]
}
```

### Scenario 2: Experienced User (Morning Person)

**Input**: Create medium priority task
**Data**:

- 45 completions
- Peak hours: 9am (15x), 10am (12x), 11am (8x)
- Productive days: Mon (20x), Wed (15x), Fri (18x)

**Output**:

```javascript
{
  suggestedTime: "Next Monday at 9:00 AM",
  confidence: 85%,
  reason: "You're most productive in the morning based on your completion history",
  alternatives: [
    { time: "Next Monday at 10:00 AM", confidence: 78% },
    { time: "Next Wednesday at 9:00 AM", confidence: 72% }
  ]
}
```

### Scenario 3: Evening Person with High Priority

**Input**: Create high priority task
**Data**:

- 60 completions
- Peak hours: 6pm (20x), 7pm (15x), 8pm (10x)
- Productive days: Tue (18x), Thu (22x), Sat (15x)

**Output**:

```javascript
{
  suggestedTime: "Today at 6:00 PM",  // Adjusted for high priority
  confidence: 88%,
  reason: "You're most productive in the evening based on your completion history",
  alternatives: [
    { time: "Today at 7:00 PM", confidence: 82% },
    { time: "Tomorrow at 6:00 PM", confidence: 85% }
  ]
}
```

## Performance Characteristics

### Time Complexity

- Pattern analysis: O(n) where n = number of hours/days with data
- Suggestion generation: O(1)
- Confidence calculation: O(1)
- Alternative generation: O(1)

### Space Complexity

- Daily pattern: O(24) - max 24 hours
- Weekly pattern: O(7) - max 7 days
- Total: O(31) - constant space

### Update Frequency

- Patterns update: After each task completion
- Analysis runs: On-demand when creating tasks
- No background processing required

## Integration Points

### 1. Task Creation

```typescript
// In TaskCreationModal
const suggestions = SmartPlanningService.getSmartSuggestions(taskInput);
// Display suggestions to user
```

### 2. Task Completion

```typescript
// In TodayScreen
SmartPlanningService.updateUserStats(completedTask);
// Patterns automatically updated
```

### 3. Statistics Display

```typescript
// In AchievementsScreen or SettingsScreen
const stats = getStats();
// Show user their patterns
```

## Configuration

### Tunable Parameters

```typescript
class SmartPlanningService {
  private readonly LEARNING_RATE = 0.3; // How fast to adapt
  private readonly MIN_SAMPLES = 5; // Min data for suggestions
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Min confidence for display

  // Adjust these to change behavior:
  // - Higher LEARNING_RATE = faster adaptation, less stability
  // - Higher MIN_SAMPLES = more reliable but slower to start
  // - Higher CONFIDENCE_THRESHOLD = fewer but better suggestions
}
```

## Privacy & Security

- ✅ All computations run on-device
- ✅ No data sent to servers
- ✅ No external ML models
- ✅ Patterns stored in encrypted Realm database
- ✅ User can reset all data anytime

## Future Enhancements

### Potential Improvements

1. **Category-based patterns**: Learn patterns per task category
2. **Duration estimation**: Predict how long tasks will take
3. **Energy level tracking**: Suggest tasks based on typical energy patterns
4. **Weather integration**: Adjust outdoor task suggestions
5. **Calendar integration**: Avoid suggesting times with conflicts
6. **Multi-user patterns**: Learn from household/team patterns

### Advanced Features

1. **Anomaly detection**: Identify unusual completion patterns
2. **Trend analysis**: Detect improving/declining productivity
3. **Seasonal patterns**: Adjust for time of year
4. **Habit formation**: Suggest times to build new habits
5. **Workload optimization**: Balance task distribution

## Conclusion

The Smart Planning Algorithm provides an AI-like experience using simple but effective statistical analysis. It learns from user behavior, adapts over time, and provides confident, explainable suggestions - all while running entirely offline on the user's device.

The algorithm strikes a balance between:

- **Simplicity**: Easy to understand and maintain
- **Effectiveness**: Provides genuinely useful suggestions
- **Privacy**: No data leaves the device
- **Performance**: Fast, efficient computations
- **Adaptability**: Learns and improves with use

This creates a "smart assistant" feel without requiring complex ML models or cloud infrastructure.
