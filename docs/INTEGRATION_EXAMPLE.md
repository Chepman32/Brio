# RT Algorithm Integration Example

## Integrating RT Features into TaskCreationModal

Here's how to enhance the TaskCreationModal with RT-based smart suggestions:

### Step 1: Import RT Hook

```typescript
import { useNotificationRT } from '../hooks/useNotificationRT';
```

### Step 2: Add RT Hook to Component

```typescript
export const TaskCreationModal: React.FC<TaskCreationModalProps> = ({
  visible,
  onClose,
  onSave,
  editTask,
}) => {
  // Existing state...
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Add RT hook
  const {
    focusWindows,
    loading: rtLoading,
    suggestBestTime,
    getSnoozeOptions,
  } = useNotificationRT(category || 'general');

  // Add RT suggestion state
  const [rtSuggestion, setRtSuggestion] = useState<{
    time: Date;
    confidence: number;
    reason: string;
  } | null>(null);
```

### Step 3: Generate RT Suggestions

```typescript
// Generate RT-based suggestion when category/priority changes
useEffect(() => {
  if (visible && !editTask && category) {
    generateRTSuggestion();
  }
}, [category, priority, visible, editTask]);

const generateRTSuggestion = async () => {
  try {
    const bestTime = await suggestBestTime();
    if (bestTime) {
      // Get the focus window details for this suggestion
      const window = focusWindows.find(w => {
        const windowTime = new Date();
        windowTime.setDate(
          windowTime.getDate() + ((w.dow - windowTime.getDay() + 7) % 7),
        );
        const minutes = w.startBin * 30;
        windowTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        return (
          Math.abs(windowTime.getTime() - bestTime.getTime()) < 60 * 60 * 1000
        );
      });

      setRtSuggestion({
        time: bestTime,
        confidence: window?.confidence || 0.5,
        reason: window
          ? `You typically respond ${Math.round(
              window.medianRtMs / 60000,
            )} min after notifications at this time`
          : 'Based on your notification patterns',
      });
    }
  } catch (error) {
    console.error('Error generating RT suggestion:', error);
  }
};
```

### Step 4: Display RT Suggestion Card

```typescript
{
  /* RT-Based Smart Suggestion */
}
{
  rtSuggestion && !editTask && (
    <View style={styles.rtSuggestionCard}>
      <View style={styles.suggestionHeader}>
        <View style={styles.suggestionTitleRow}>
          <Icon name="notifications-outline" size={20} color="#8B5CF6" />
          <Text style={styles.suggestionTitle}>Optimal Notification Time</Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: '#8B5CF6' }]}>
          <Text style={styles.confidenceText}>
            {Math.round(rtSuggestion.confidence * 100)}% confidence
          </Text>
        </View>
      </View>

      <Text style={styles.suggestionReason}>{rtSuggestion.reason}</Text>

      <Text style={styles.suggestionTime}>
        {rtSuggestion.time.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}{' '}
        at {formatTime(rtSuggestion.time)}
      </Text>

      <Pressable
        style={[styles.applySuggestionButton, { backgroundColor: '#8B5CF6' }]}
        onPress={() => {
          setDueDate(rtSuggestion.time);
          setDueTime(rtSuggestion.time);
          setRtSuggestion(null);
        }}
      >
        <Text style={styles.applySuggestionText}>Use This Time</Text>
      </Pressable>

      {/* Show Focus Windows */}
      {focusWindows.length > 0 && (
        <View style={styles.focusWindowsPreview}>
          <Text style={styles.focusWindowsTitle}>
            Your best times for {category}:
          </Text>
          {focusWindows.slice(0, 3).map((window, idx) => (
            <Text key={idx} style={styles.focusWindowItem}>
              • {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][window.dow]}{' '}
              {formatBinTime(window.startBin)}({Math.round(
                window.pOpen5m * 100,
              )}% quick response)
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
```

### Step 5: Add Helper Function

```typescript
const formatBinTime = (bin: number): string => {
  const minutes = bin * 30;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
};
```

### Step 6: Add Styles

```typescript
rtSuggestionCard: {
  backgroundColor: '#F5F3FF',
  borderRadius: 16,
  padding: 16,
  marginTop: 8,
  borderWidth: 2,
  borderColor: '#8B5CF6',
},
focusWindowsPreview: {
  marginTop: 12,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: '#DDD6FE',
},
focusWindowsTitle: {
  fontSize: 13,
  fontWeight: '600',
  color: '#6B21A8',
  marginBottom: 6,
},
focusWindowItem: {
  fontSize: 12,
  color: '#7C3AED',
  marginBottom: 3,
},
```

## Integrating Smart Snooze

### In Task Detail or Notification Handler:

```typescript
import { NotificationService } from '../services/NotificationService';

const handleSnooze = async (task: TaskType) => {
  // Get smart snooze options
  const options = await NotificationService.getSmartSnoozeOptions(
    task._id,
    task.category || 'general',
  );

  // Display options to user
  Alert.alert(
    'Snooze Task',
    'When would you like to be reminded?',
    options.map(option => ({
      text: `${option.label} - ${option.reason}`,
      onPress: () => {
        const snoozeUntil = new Date(Date.now() + option.minutes * 60 * 1000);
        updateTask(task._id, { snoozedUntil: snoozeUntil });
      },
    })),
  );
};
```

## Displaying Focus Windows in Settings

```typescript
import { FocusWindowsDisplay } from '../components/FocusWindowsDisplay';

// In Settings or Analytics screen
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Your Focus Times</Text>
  <FocusWindowsDisplay
    category="Work"
    onSelectWindow={window => {
      // Optionally allow user to schedule tasks at this time
      navigation.navigate('CreateTask', {
        suggestedTime: window.startBin,
        suggestedDay: window.dow,
      });
    }}
  />
</View>;
```

## Logging Notification Interactions

### When User Opens Notification:

```typescript
// In your notification handler
PushNotificationIOS.addEventListener('notification', async notification => {
  const data = notification.getData();

  if (data && data.taskId) {
    // Log the interaction for RT learning
    await NotificationService.logNotificationInteraction(
      data.taskId,
      'open',
      data.category,
      data.priority,
    );

    // Navigate to task
    navigateToTask(data.taskId);
  }
});
```

### When User Completes Task from Notification:

```typescript
const handleCompleteFromNotification = async (task: TaskType) => {
  // Log completion from push
  await NotificationService.logNotificationInteraction(
    task._id,
    'completeFromPush',
    task.category,
    task.priority,
  );

  // Complete the task
  await completeTask(task._id);
};
```

### When User Dismisses Notification:

```typescript
const handleDismiss = async (task: TaskType) => {
  await NotificationService.logNotificationInteraction(
    task._id,
    'dismiss',
    task.category,
    task.priority,
  );
};
```

## Complete Integration Flow

```
1. User creates task with category "Work"
   ↓
2. RT hook suggests optimal time based on past patterns
   ↓
3. User accepts suggestion or chooses custom time
   ↓
4. NotificationService schedules notification at RT-optimized time
   (adjusts for expected reaction time)
   ↓
5. Notification delivered
   ↓
6. User opens notification (RT tracked)
   ↓
7. RT service updates statistics
   ↓
8. Future suggestions improve based on new data
```

## Testing the Integration

```typescript
// Test RT service directly
import { NotificationRTService } from '../services/NotificationRTService';

// Clear stats for fresh start
await NotificationRTService.clearStats();

// Simulate some events
for (let i = 0; i < 10; i++) {
  await NotificationRTService.logEvent({
    id: `test-${i}`,
    taskId: `task-${i}`,
    category: 'Work',
    deliveredAt: Date.now() - 20 * 60 * 1000, // 20 min ago
    openedAt: Date.now() - 15 * 60 * 1000, // 15 min ago (5 min RT)
    action: 'open',
    dayOfWeek: 1, // Monday
    hourBin: 18, // 9:00 AM
    priority01: 1.0,
    dueInMinAtDelivery: 60,
    isSilent: false,
  });
}

// Check results
const windows = await NotificationRTService.getFocusWindows('Work');
console.log('Focus windows:', windows);

const recommendation = await NotificationRTService.getOptimalSlot(
  'Work',
  'high',
);
console.log('Recommendation:', recommendation);
```

## Monitoring and Analytics

```typescript
// Export stats for analysis
const stats = await NotificationRTService.exportStats();

// Analyze patterns
Object.entries(stats.slots).forEach(([key, slot]) => {
  const [category, dow, bin] = key.split(':');
  const pOpen5m = slot.open5m_a / (slot.open5m_a + slot.open5m_b);
  const medianRt = Math.exp(slot.lnRt_mean);

  console.log(`${category} on ${dow} at bin ${bin}:`);
  console.log(`  Quick response: ${(pOpen5m * 100).toFixed(1)}%`);
  console.log(`  Median RT: ${(medianRt / 60000).toFixed(1)} min`);
  console.log(`  Samples: ${slot.delivered}`);
});
```

This integration provides a seamless, intelligent notification experience that learns and adapts to each user's unique patterns!
