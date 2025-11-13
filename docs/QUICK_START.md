# Brio - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites

- Node.js >= 20
- Xcode (for iOS)
- CocoaPods
- React Native CLI

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Install iOS pods
cd ios && pod install && cd ..

# 3. Run on iOS simulator
npm run ios
```

That's it! The app should launch with the animated splash screen.

## 🎮 Try These Features

### 1. Create Your First Task

1. Tap the purple **+** button (bottom right)
2. Enter a task title
3. Select priority (try "High")
4. Notice the **🤖 Smart Suggestion** appear
5. Tap "Apply Suggestion" or set your own time
6. Tap "Save"

### 2. Complete a Task

1. Find a task in the list
2. **Swipe right** → Task completes with animation!
3. Watch it disappear smoothly

### 3. Snooze a Task

1. Find a task
2. **Swipe left** → Task moves to tomorrow

### 4. View Calendar

1. Tap "Plan" tab (bottom)
2. Try the view modes: Day, Week, Month
3. **Pinch** to zoom between modes
4. **Swipe left/right** to navigate periods

### 5. Check Achievements

1. Complete 3 tasks
2. Tap "Achievements" tab
3. See your first achievement unlock!
4. View your streak counter

### 6. Explore Settings

1. Tap "Settings" tab
2. Toggle dark mode
3. Change notification timing
4. See the smart planning explanation

## 🤖 Smart Algorithm in Action

### Build Your Pattern

1. Create 5-10 tasks
2. Complete them at different times
3. Notice the app learning your patterns

### See Smart Suggestions

1. Create a new task
2. Watch the suggestion appear
3. Note the confidence percentage
4. See the reasoning explanation
5. Check alternative suggestions

### Example Pattern

```
Complete tasks at:
- 9am (3 times)
- 2pm (2 times)
- 6pm (4 times)

Next suggestion will be:
"6:00 PM - You're most productive in the evening"
Confidence: 75%
```

## 📱 Key Gestures

| Gesture                     | Action           |
| --------------------------- | ---------------- |
| Swipe right on task         | Complete         |
| Swipe left on task          | Snooze           |
| Tap task                    | View details     |
| Long press task             | Drag mode        |
| Horizontal swipe (calendar) | Navigate periods |
| Pinch (calendar)            | Zoom modes       |
| Tap + button                | Create task      |

## 🏆 Unlock Achievements

### Quick Achievements

1. **First Task**: Create your first task
2. **3-Day Streak**: Complete tasks 3 days in a row
3. **First Steps**: Complete 10 tasks total

### Longer Term

1. **7-Day Streak**: Week of completions
2. **Getting Started**: 50 tasks completed
3. **Perfect Week**: Complete all tasks for a week

## 🔔 Test Notifications

1. Go to Settings
2. Enable notifications
3. Set reminder time (try 5 minutes)
4. Create a task with due time in 10 minutes
5. Wait 5 minutes → notification appears!

## 📊 View Your Stats

### In Achievements Screen

- Current streak
- Longest streak
- Total tasks completed
- Achievement progress

### Pattern Analysis

The app tracks:

- What time you complete tasks
- Which days you're most productive
- Your completion velocity
- Task priority patterns

## 🎨 Customize

### Theme

Settings → Dark Mode toggle

### Notifications

Settings → Enable/Disable
Settings → Reminder Time (5, 15, 30, 60 min)

### Reset Data

Settings → Reset All Data (careful!)

## 🐛 Troubleshooting

### App won't build

```bash
# Clean and reinstall
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..
npm run ios
```

### Database errors

```bash
# Reset simulator
xcrun simctl erase all
npm run ios
```

### Gesture not working

- Make sure you're swiping far enough (100px threshold)
- Try on a physical device for best experience

### Notifications not appearing

- Check Settings → Notifications are enabled
- Verify iOS permissions granted
- Ensure task has due time set

## 📖 Learn More

### Documentation

- `README.md` - Overview and features
- `PRODUCTION_READY_SUMMARY.md` - Complete feature list
- `SMART_ALGORITHM_GUIDE.md` - Algorithm deep dive
- `IMPLEMENTATION_STATUS.md` - Development progress

### Code Structure

```
src/
├── components/     # UI components
├── screens/        # Main screens
├── services/       # Business logic
├── database/       # Realm operations
├── types/          # TypeScript types
└── utils/          # Helper functions
```

### Key Files

- `App.tsx` - App entry point
- `src/services/SmartPlanningService.ts` - Smart algorithm
- `src/services/AchievementService.ts` - Gamification
- `src/database/realm.ts` - Database setup

## 🎯 Next Steps

### For Users

1. Create 10+ tasks
2. Complete them over several days
3. Watch the smart suggestions improve
4. Try to maintain a streak
5. Unlock all achievements

### For Developers

1. Read `SMART_ALGORITHM_GUIDE.md`
2. Explore `SmartPlanningService.ts`
3. Check out the gesture implementations
4. Review the animation code
5. Understand the database schema

## 💡 Pro Tips

### Get Better Suggestions

- Complete tasks consistently
- Vary your completion times
- Use different priorities
- Complete at least 10 tasks

### Maximize Streaks

- Open app daily
- Complete at least one task per day
- Check achievements regularly
- Don't break the chain!

### Smooth Performance

- Keep task list under 1000 items
- Archive old completed tasks
- Restart app occasionally
- Update to latest version

## 🎉 You're Ready!

You now have a fully functional smart reminder app with:

- ✅ AI-like task suggestions
- ✅ Smooth gesture controls
- ✅ Achievement system
- ✅ Offline functionality
- ✅ Beautiful animations

Start creating tasks and let Brio learn your patterns!

## 📞 Support

### Issues?

- Check `TROUBLESHOOTING.md`
- Review console logs
- Test on physical device
- Check iOS permissions

### Questions?

- Read the documentation
- Review the code comments
- Check the SDD.md
- Explore the services

## 🚀 Happy Task Managing!

Brio is designed to learn from you and adapt to your workflow. The more you use it, the smarter it gets. Enjoy your productive journey!
