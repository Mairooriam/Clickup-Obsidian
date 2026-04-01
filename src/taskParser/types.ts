export interface TaskFlags {
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'todo' | 'in-progress' | 'done' | 'blocked';
  assignee?: string;
  dueDate?: Date;
  tags?: string[];
  estimate?: number;

  // Allow custom flags
  [key: string]: any;
}

export interface Task {
  name: string;
  level: number;
  flags?: TaskFlags;
}

const SUPPORTED_FLAGS = new Set(['id', 'parent']);

export function setTaskFlag(task: Task, flagName: string, value: any, allowCustomFlags: boolean = false): void {
  if (!allowCustomFlags && !SUPPORTED_FLAGS.has(flagName)) {
    return;
  }

  if (!task.flags) {
    task.flags = {};
  }

  //TODO: add type validation
  if (!SUPPORTED_FLAGS.has(flagName)) {
    console.log(`Custom flag added: "${flagName}" with value:`, value);
  }

  task.flags[flagName] = value;
}
