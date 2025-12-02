import Realm from 'realm';

export class Task extends Realm.Object<Task> {
  _id!: string;
  title!: string;
  notes?: string;
  dueDate!: Date;
  dueTime?: Date;
  category?: string;
  priority!: 'low' | 'medium' | 'high';
  icon?: string;
  recurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  completed!: boolean;
  completedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
  snoozedUntil?: Date;

  static schema: Realm.ObjectSchema = {
    name: 'Task',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      title: 'string',
      notes: 'string?',
      dueDate: 'date',
      dueTime: 'date?',
      category: 'string?',
      priority: 'string',
      icon: 'string?',
      recurring: { type: 'bool', default: false },
      recurringFrequency: 'string?',
      completed: { type: 'bool', default: false },
      completedAt: 'date?',
      createdAt: 'date',
      updatedAt: 'date',
      snoozedUntil: 'date?',
    },
  };
}
