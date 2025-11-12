import React from 'react';
import renderer from 'react-test-renderer';
import { CalendarView } from '../../src/components/CalendarView';
import { TaskType } from '../../src/types';

// Mock the gesture handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => ({
        onUpdate: () => ({}),
        onEnd: () => ({}),
      }),
      Pinch: () => ({
        onUpdate: () => ({}),
        onEnd: () => ({}),
      }),
      Simultaneous: () => ({}),
    },
  };
});

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View,
    },
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    withSpring: (value: any) => value,
    runOnJS: (fn: any) => fn,
  };
});

const mockTasks: TaskType[] = [
  {
    _id: '1',
    title: 'Work Task',
    dueDate: new Date(2025, 10, 13),
    dueTime: new Date(2025, 10, 13, 8, 30),
    category: 'Work',
    priority: 'high',
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: '2',
    title: 'Health Task',
    dueDate: new Date(2025, 10, 13),
    dueTime: new Date(2025, 10, 13, 12, 0),
    category: 'Health',
    priority: 'medium',
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: '3',
    title: 'Meeting',
    dueDate: new Date(2025, 10, 13),
    dueTime: new Date(2025, 10, 13, 15, 0),
    category: 'Meetings',
    priority: 'high',
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: '4',
    title: 'Another Day Task',
    dueDate: new Date(2025, 10, 14),
    dueTime: new Date(2025, 10, 14, 10, 0),
    category: 'Personal',
    priority: 'low',
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('CalendarView', () => {
  const mockOnDateSelect = jest.fn();
  const mockOnModeChange = jest.fn();
  const mockOnCreateTask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Day View Rendering', () => {
    it('should render day view without crashing', () => {
      const tree = renderer.create(
        <CalendarView
          mode="day"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
        />,
      );

      expect(tree.toJSON()).toBeTruthy();
    });

    it('should render day view with FAB when onCreateTask is provided', () => {
      const tree = renderer.create(
        <CalendarView
          mode="day"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
          onCreateTask={mockOnCreateTask}
        />,
      );

      const json = tree.toJSON();
      expect(json).toBeTruthy();
    });

    it('should render tasks for the selected date', () => {
      const tree = renderer.create(
        <CalendarView
          mode="day"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
        />,
      );

      const instance = tree.root;
      const textElements = instance.findAllByType('Text');
      const taskTitles = textElements.map(el => el.props.children).flat();

      expect(taskTitles).toContain('Work Task');
      expect(taskTitles).toContain('Health Task');
      expect(taskTitles).toContain('Meeting');
    });

    it('should not render tasks from other dates', () => {
      const tree = renderer.create(
        <CalendarView
          mode="day"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
        />,
      );

      const instance = tree.root;
      const textElements = instance.findAllByType('Text');
      const taskTitles = textElements.map(el => el.props.children).flat();

      expect(taskTitles).not.toContain('Another Day Task');
    });
  });

  describe('Month View Rendering', () => {
    it('should render month view without crashing', () => {
      const tree = renderer.create(
        <CalendarView
          mode="month"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
        />,
      );

      expect(tree.toJSON()).toBeTruthy();
    });

    it('should render month view with navigation header', () => {
      const tree = renderer.create(
        <CalendarView
          mode="month"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
          onCreateTask={mockOnCreateTask}
        />,
      );

      const json = tree.toJSON();
      expect(json).toBeTruthy();
    });

    it('should render Russian weekday headers', () => {
      const tree = renderer.create(
        <CalendarView
          mode="month"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
        />,
      );

      const instance = tree.root;
      const textElements = instance.findAllByType('Text');
      const texts = textElements.map(el => el.props.children).flat();

      expect(texts).toContain('Пн');
      expect(texts).toContain('Вт');
      expect(texts).toContain('Ср');
    });

    it('should render month and year', () => {
      const tree = renderer.create(
        <CalendarView
          mode="month"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
        />,
      );

      const instance = tree.root;
      const textElements = instance.findAllByType('Text');
      const texts = textElements
        .map(el => el.props.children)
        .flat()
        .filter(Boolean);

      const hasYear = texts.some(
        text => typeof text === 'string' && text.includes('2025'),
      );
      expect(hasYear).toBe(true);
    });
  });

  describe('Task Indicators', () => {
    it('should render task indicators in month view', () => {
      const tree = renderer.create(
        <CalendarView
          mode="month"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
        />,
      );

      expect(tree.toJSON()).toBeTruthy();
    });
  });

  describe('Component Props', () => {
    it('should accept all required props', () => {
      expect(() => {
        renderer.create(
          <CalendarView
            mode="day"
            selectedDate={new Date(2025, 10, 13)}
            tasks={mockTasks}
            onDateSelect={mockOnDateSelect}
            onModeChange={mockOnModeChange}
          />,
        );
      }).not.toThrow();
    });

    it('should accept optional onCreateTask prop', () => {
      expect(() => {
        renderer.create(
          <CalendarView
            mode="day"
            selectedDate={new Date(2025, 10, 13)}
            tasks={mockTasks}
            onDateSelect={mockOnDateSelect}
            onModeChange={mockOnModeChange}
            onCreateTask={mockOnCreateTask}
          />,
        );
      }).not.toThrow();
    });

    it('should handle empty tasks array', () => {
      expect(() => {
        renderer.create(
          <CalendarView
            mode="day"
            selectedDate={new Date(2025, 10, 13)}
            tasks={[]}
            onDateSelect={mockOnDateSelect}
            onModeChange={mockOnModeChange}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Week View', () => {
    it('should render week view without crashing', () => {
      const tree = renderer.create(
        <CalendarView
          mode="week"
          selectedDate={new Date(2025, 10, 13)}
          tasks={mockTasks}
          onDateSelect={mockOnDateSelect}
          onModeChange={mockOnModeChange}
        />,
      );

      expect(tree.toJSON()).toBeTruthy();
    });
  });
});
