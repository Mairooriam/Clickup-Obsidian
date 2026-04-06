export const SUPPORTED_FLAGS = new Set(['id', 'parent', "top_level_parent"]);

export class TaskFlags {
  private readonly _brand = "TaskFlags";
  parent?: string;
  id?: string;
  top_level_parnet?: string;


  [key: string]: any;
  toString(): string {
    return Object.entries(this)
      .map(([key, value]) => `[${key}:${value}]`)
      .join(" ");
  }
}

export class Task {
  private readonly _brand = "Task";
  name: string;
  level: number;
  flags?: TaskFlags;

  constructor(name: string, level: number, flags?: TaskFlags) {
    this.name = name;
    this.level = level;
    this.flags = flags;
  }

  toString(): string {
    const base = '\t'.repeat(this.level) + `- ${this.name}`;
    const flagsString = this.flags ? ` ${this.flags.toString()}` : "";
    return base + flagsString;
  }
}

export function tasksToString(tasks: Task[]): string {
  let result = "";
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    result += task.toString() + "\n";
  }
  return result
}

export class TaskCache {
  map: Map<string, Task> = new Map();
  children: Map<string, Task[]> = new Map();
  roots: Task[] = [];

  toString(): string {
    const lines: string[] = [];

    const visit = (task: Task): void => {
      lines.push(task.toString());
      this.children.get(task.flags?.id ?? "")?.forEach(visit);
    };

    this.roots.forEach(visit);

    return lines.join("\n");
  }
}

export class Stack<T> {
  private stack: T[] = []

  top(): T | undefined {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
  }

  size(): number {
    return this.stack.length;
  }

  pop(): T | undefined {
    return this.stack.pop();
  }

  push(item: T): void {
    this.stack.push(item);
  }

  empty(): boolean {
    return this.stack.length === 0;
  }

  clear(): void {
    this.stack = [];
  }
}
