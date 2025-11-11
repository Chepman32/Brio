import { getRealm } from '../realm';
import { Task } from '../schemas';
import { BSON } from 'realm';

export interface TaskInput {
  title: string;
  notes?: string;
  dueDate: Date;
  dueTime?: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
}

export const createTask = (input: TaskInput): Task => {
  const realm = getRealm();
  let task: Task;

  realm.write(() => {
    task = realm.create<Task>('Task', {
      _id: new BSON.ObjectId().toHexString(),
      ...input,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  return task!;
};

export const getTasks = (): Realm.Results<Task> => {
  const realm = getRealm();
  return realm.objects<Task>('Task').sorted('dueDate', false);
};

export const getTasksByDate = (date: Date): Task[] => {
  const realm = getRealm();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return realm
    .objects<Task>('Task')
    .filtered('dueDate >= $0 AND dueDate <= $1', startOfDay, endOfDay)
    .sorted('dueDate');
};

export const getTaskById = (id: string): Task | null => {
  const realm = getRealm();
  return realm.objectForPrimaryKey<Task>('Task', id);
};

export const updateTask = (id: string, updates: Partial<TaskInput>): void => {
  const realm = getRealm();
  const task = realm.objectForPrimaryKey<Task>('Task', id);

  if (!task) {
    throw new Error(`Task with id ${id} not found`);
  }

  realm.write(() => {
    Object.assign(task, updates, { updatedAt: new Date() });
  });
};

export const completeTask = (id: string): void => {
  const realm = getRealm();
  const task = realm.objectForPrimaryKey<Task>('Task', id);

  if (!task) {
    throw new Error(`Task with id ${id} not found`);
  }

  realm.write(() => {
    task.completed = true;
    task.completedAt = new Date();
    task.updatedAt = new Date();
  });
};

export const snoozeTask = (id: string, until: Date): void => {
  const realm = getRealm();
  const task = realm.objectForPrimaryKey<Task>('Task', id);

  if (!task) {
    throw new Error(`Task with id ${id} not found`);
  }

  realm.write(() => {
    task.snoozedUntil = until;
    task.dueDate = until;
    task.updatedAt = new Date();
  });
};

export const deleteTask = (id: string): void => {
  const realm = getRealm();
  const task = realm.objectForPrimaryKey<Task>('Task', id);

  if (!task) {
    throw new Error(`Task with id ${id} not found`);
  }

  realm.write(() => {
    realm.delete(task);
  });
};
