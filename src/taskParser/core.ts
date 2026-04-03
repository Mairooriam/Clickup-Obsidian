import { Task, SUPPORTED_FLAGS, TaskFlags, TaskCache } from "./types.js"
import { Lexer } from "./lexer.js"
import { Parser } from "./parser.js";
import { last } from "lodash";


export function taskSetFlag(task: Task, flagName: string, value: any, allowCustomFlags: boolean = false): void {
  if (!allowCustomFlags && !SUPPORTED_FLAGS.has(flagName)) {
    return;
  }

  if (!task.flags) {
    task.flags = new TaskFlags();
  }

  //TODO: add type validation
  if (!SUPPORTED_FLAGS.has(flagName)) {
    console.log(`Custom flag added: "${flagName}" with value:`, value);
  }

  task.flags[flagName] = value;
}

export function taskHasFlag(task: Task, flagName: string, value?: string): boolean {
  if (!task.flags) {
    return false;
  }

  for (const [key, val] of Object.entries(task.flags)) {
    if (key === flagName) {
      if (value === undefined || val === value) {
        return true;
      }
    }
  }

  return false;
}

export function taskGetFlag(task: Task, flagName: string): string {
  if (!task.flags) {
    return "";
  }

  for (const [key, val] of Object.entries(task.flags)) {
    if (key === flagName) {
      return val;
    }
  }

  return "";
}

export function taskHasPlaceholderId(task: Task): boolean {
  const id = task.flags?.id;
  if (id) {
    if (id.includes("placeholder_")) {
      return true;
    }
  }
  return false;
}


export function resolveParents(tasks: Task[]): void {
  const idPrefix = "placeholder_";
  let idx = 0;

  let lastTask: Task | null = null;
  let lastIndent = 1;
  for (let i = 0; i < tasks.length; i++) {
    const currentTask = tasks[i];
    if (!currentTask.flags?.id) {
      let id = idPrefix + idx;
      taskSetFlag(currentTask, "id", id);
      idx++;
    }

    if (currentTask.level == 1 || !lastTask) {
      console.log("hit level 1 or not lastTask iteration with: n:%s , l:%s \n", currentTask.name, currentTask.level);
      lastIndent = currentTask.level;
      lastTask = currentTask;
      continue;
    }

    let validParent: boolean = ((currentTask.level - lastIndent) == 1)
    console.log("validParent b:%b, curL:  LL:", validParent, currentTask.level, lastIndent);
    if (validParent) {

      let id = taskGetFlag(lastTask, "id");
      taskSetFlag(currentTask, "parent", id);
    }

    lastIndent = currentTask.level;
    lastTask = currentTask;
  }
}
export function cacheCollectRoots(cache: TaskCache, tasks: Task[]): number {
  let rootCount = 0;
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const parentVal = task.flags?.parent;
    if (parentVal === undefined) {
      cache.rootNodes.push(task);
      rootCount++;
    }
  }
  return rootCount;
}

export function cacheRemoveNonPlaceholderIds(cache: TaskCache): number {
  const before = cache.rootNodes.length;
  cache.rootNodes = cache.rootNodes.filter(task => taskHasPlaceholderId(task));
  return before - cache.rootNodes.length;
}

