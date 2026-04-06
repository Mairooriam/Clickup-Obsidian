import { Task, SUPPORTED_FLAGS, TaskFlags, TaskCache, Stack } from "./types.js"
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

    let stack = new Stack<Task>();

    for (const task of tasks) {

      while (stack.top() && stack.top()!.level >= task.level) {
        stack.pop();
      }

      if (!stack.empty()) {
        let parentId = taskGetFlag(stack.top()!, "id");
        taskSetFlag(task, "parent", parentId);
      }
      stack.push(task);
    }

    lastIndent = currentTask.level;
    lastTask = currentTask;
  }
}


















// for (const task of tasks) {
//   // Remove tasks from stack until we find the parent
//   while (stack.length > 0 && stack[stack.length - 1].level >= task.level) {
//     stack.pop();
//   }
//   // If there's a parent on the stack, assign it
//   if (stack.length > 0) {
//     let parentId = taskGetFlag(stack[stack.length - 1], "id");
//     taskSetFlag(task, "parent", parentId);
//   }
//   stack.push(task);
// }

export function cacheBuildTaskCache(tasks: Task[]): TaskCache {
  const result = new TaskCache();

  // Push tasks into map
  for (const task of tasks) {
    const id = task.flags?.id;
    if (id) result.map.set(id, task);
  }

  // Resolve parents
  for (const task of tasks) {
    const parentId = task.flags?.parent;

    //TODO: improve null checking or make higher level change to not string null
    if (!parentId || parentId === "null") {
      result.roots.push(task);
    } else {
      if (!result.children.has(parentId)) {
        result.children.set(parentId, []);
      }
      result.children.get(parentId)!.push(task);
    }
  }

  // Resolve indent recursively
  const visitChild = (task: Task, indent: number): void => {
    task.level = indent;
    result.children.get(task.flags?.id ?? "")?.forEach((child: Task) => visitChild(child, indent + 1));
  };

  result.roots.forEach((root: Task) => visitChild(root, 0));

  return result;
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
