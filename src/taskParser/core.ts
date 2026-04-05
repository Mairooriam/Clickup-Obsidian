import { Task, SUPPORTED_FLAGS, TaskFlags, TaskCache } from "./types.js"
import { clickup_Task } from "./apiTypes/index.js"


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

// tells whether two tasks are the same
export function taskMatch(t1: Task, t2: Task): boolean {
  if (t1.name !== t2.name) return false;
  if (!t1.flags || !t2.flags) return t1.flags === t2.flags;

  for (const [key, val] of Object.entries(t1.flags)) {
    if (key === "_brand") continue;
    if (t2.flags[key] !== val) return false;
  }

  return true;
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

export function taskMapClickupResponse(clickup_task: clickup_Task): Task {
  let task = new Task(clickup_task.name, 0);
  if (!task.flags) {
    task.flags = new TaskFlags();
  }
  task.flags.id = clickup_task.id;
  task.flags.parent = clickup_task.parent;
  task.flags.top_level_parnet = clickup_task.top_level_parent;

  return task
}

export function taskMapClickupResponses(clickup_tasks: clickup_Task[]): Task[] {
  let tasks: Task[] = [];
  for (let i = 0; i < clickup_tasks.length; i++) {
    const clickup_task = clickup_tasks[i];
    tasks.push(taskMapClickupResponse(clickup_task));
  }

  return tasks;
}


export function tasksResolveParents(tasks: Task[]): void {
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
      // console.log("hit level 1 or not lastTask iteration with: n:%s , l:%s \n", currentTask.name, currentTask.level);
      lastIndent = currentTask.level;
      lastTask = currentTask;
      continue;
    }

    let validParent: boolean = ((currentTask.level - lastIndent) == 1)
    // console.log("validParent b:%b, curL:  LL:", validParent, currentTask.level, lastIndent);
    if (validParent) {

      let id = taskGetFlag(lastTask, "id");
      taskSetFlag(currentTask, "parent", id);
    }

    lastIndent = currentTask.level;
    lastTask = currentTask;
  }
}

// export function cacheCollectRoots(cache: TaskCache, tasks: Task[]): number {
//   let rootCount = 0;
//   for (let i = 0; i < tasks.length; i++) {
//     const task = tasks[i];
//     const parentVal = task.flags?.parent;
//     if (parentVal === undefined) {
//       cache.rootNodes.push(task);
//       rootCount++;
//     }
//   }
//   return rootCount;
// }

// export function cacheRemoveNonPlaceholderIds(cache: TaskCache): number {
//   const before = cache.rootNodes.length;
//   cache.rootNodes = cache.rootNodes.filter(task => taskHasPlaceholderId(task));
//   return before - cache.rootNodes.length;
// }
export function cacheBuildString(cache: TaskCache): string {
  const lines: string[] = [];

  const visit = (task: Task): void => {
    lines.push(task.toString());
    cache.children.get(task.flags?.id ?? "")?.forEach(visit);
  };

  cache.roots.forEach(visit);

  return lines.join("\n");
}

export function cacheBuildTaskCache(tasks: Task[]): TaskCache {
  const map = new Map<string, Task>();
  const children = new Map<string, Task[]>();
  const roots: Task[] = [];

  // Push tasks into map
  for (const task of tasks) {
    const id = task.flags?.id;
    if (id) map.set(id, task);
  }

  // Resolve parents
  for (const task of tasks) {
    const parentId = task.flags?.parent;

    //TODO: improve null checking or make higher level change to not string null
    if (!parentId || parentId === "null") {
      roots.push(task);
    } else {
      if (!children.has(parentId)) {
        children.set(parentId, []);
      }
      children.get(parentId)!.push(task);
    }
  }

  // Resolve indent recursively
  const visitChild = (task: Task, indent: number): void => {
    task.level = indent;
    children.get(task.flags?.id ?? "")?.forEach(child => visitChild(child, indent + 1));
  };

  roots.forEach(root => visitChild(root, 0));

  return { map, roots, children };
}


export interface cacheMatchResult {
  match: boolean;
  differing: {
    local: Task[];
    remote: Task[];
  };
}

export function cacheMatch(local: TaskCache, remote: TaskCache): cacheMatchResult {
  const result: cacheMatchResult = { match: true, differing: { local: [], remote: [] } };

  if (local.roots.length !== remote.roots.length) {
    result.match = false;
  }

  const compareNode = (localTask: Task): void => {
    const id = localTask.flags?.id;
    if (!id) throw new Error("cacheMatch: Local task missing id.");
    const remoteTask = remote.map.get(id);
    if (!remoteTask || !taskMatch(localTask, remoteTask)) {
      result.match = false;
      result.differing.local.push(localTask);
      if (remoteTask) result.differing.remote.push(remoteTask);
      // Remote doesn't know about this task at all, so all its children are new too
      if (!remoteTask) {
        local.children.get(id)?.forEach(child => collectAll(child));
        return;
      }
    }
    // Either matched or differed but exists remotely — still recurse children
    local.children.get(id)?.forEach(compareNode);
  };

  const collectAll = (task: Task): void => {
    result.differing.local.push(task);
    local.children.get(task.flags?.id ?? "")?.forEach(collectAll);
  };

  local.roots.forEach(compareNode);

  return result;
}
