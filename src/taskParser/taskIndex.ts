import type { Task } from "./types.js"
import { Lexer } from "./lexer.js"
import { Parser } from "./parser.js";

export interface TaskIndex {
  taskMap: Map<string, Task>;
  linkMap: Map<string, string[]>;
  parentMap: Map<string, string | null>;
  levelMap: Map<string, number>;
  rootTasks: Task[];
}


export function index(tasks: Task[]): Map<string, Task> {
  const result = new Map<string, Task>();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // task.

  }

  return result;
}
