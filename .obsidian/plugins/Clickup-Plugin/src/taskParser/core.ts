import { Task, SUPPORTED_FLAGS, TaskFlags, Stack } from "./types.js"

export function debugPrint(msg: string) {
  const err = new Error();
  // Parse stack trace for caller info
  const stack = err.stack?.split('\n')[2] || '';
  // Example stack line: "    at myFunction (c:\path\to\file.ts:123:45)"
  const match = stack.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/);
  if (match) {
    const [, func, file, line] = match;
    console.error(`[${func} ${file}:${line}] ${msg}`);
  } else {
    console.error(msg);
  }
}

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

export function tasksResolveParents(tasks: Task[]): void {
  const idPrefix = "placeholder_";
  let idx = 0;

  let lastTask: Task | null = null;
  for (let i = 0; i < tasks.length; i++) {
    const currentTask = tasks[i];
    if (!currentTask) {
      continue;
    }
    if (!currentTask.flags?.id) {
      let id = idPrefix + idx;
      taskSetFlag(currentTask, "id", id);
      idx++;
    }

    if (currentTask.level == 1 || !lastTask) {
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

    lastTask = currentTask;
  }
}

// export function cacheBuildTaskCache(tasks: Task[]): TaskCache {
//   const result = new TaskCache();
//
//   // Push tasks into map
//   for (const task of tasks) {
//     const id = task.flags?.id;
//     if (id) result.map.set(id, task);
//   }
//
//   // Resolve parents
//   for (const task of tasks) {
//     const parentId = task.flags?.parent;
//
//     //TODO: improve null checking or make higher level change to not string null
//     if (!parentId || parentId === "null") {
//       result.roots.push(task);
//     } else {
//       if (!result.children.has(parentId)) {
//         result.children.set(parentId, []);
//       }
//       result.children.get(parentId)!.push(task);
//     }
//   }
//
//   // Resolve indent recursively
//   const visitChild = (task: Task, indent: number): void => {
//     task.level = indent;
//     result.children.get(task.flags?.id ?? "")?.forEach((child: Task) => visitChild(child, indent + 1));
//   };
//
//   result.roots.forEach((root: Task) => visitChild(root, 0));
//
//   return result;
// }
export class TaskCache {
  map: Map<string, Task> = new Map();
  children: Map<string, Task[]> = new Map();
  roots: Task[] = [];

  constructor() {
    this.roots = [];
    this.map = new Map();
    this.children = new Map();
  }

  static fromTasks(tasks: Task[]): TaskCache {
    const tree = new TaskCache();
    for (const task of tasks) {
      const id = task.flags?.id;
      if (id) tree.map.set(id, task);
    }
    for (const task of tasks) {
      const parentId = task.flags?.parent;
      if (!parentId || parentId === "null") {
        tree.roots.push(task);
      } else {
        if (!tree.children.has(parentId)) tree.children.set(parentId, []);
        tree.children.get(parentId)!.push(task);
      }
    }
    return tree;
  }

  addNode(task: Task): boolean {
    if (!task.flags?.id) return false;
    if (this.map.has(task.flags.id)) return false;

    const parentId = task.flags?.parent;
    if (!parentId || parentId === "null") {
      task.level = 0;
      this.roots.push(task);
    } else {
      const parent = this.map.get(parentId);
      if (!parent) return false;
      task.level = parent.level + 1;
      if (!this.children.has(parentId)) this.children.set(parentId, []);
      this.children.get(parentId)!.push(task);
    }

    this.map.set(task.flags.id, task);
    return true;
  }

  removeNode(id: string): boolean {
    const node = this.map.get(id);
    if (!node) return false;

    const parentId = node.flags?.parent;

    const nodeChildren = this.children.get(id) ?? [];

    // reparent children
    for (const child of nodeChildren) {
      if (!parentId || parentId === "null") {
        taskSetFlag(child, "parent", "null");
        child.level = 0;
        this.roots.push(child);
      } else {
        taskSetFlag(child, "parent", parentId);
        child.level = node.level;
        if (!this.children.has(parentId)) this.children.set(parentId, []);
        this.children.get(parentId)!.push(child);
      }
    }

    // remove from parent's children
    if (!parentId || parentId === "null") {
      this.roots = this.roots.filter(r => r !== node);
    } else {
      const siblings = this.children.get(parentId) ?? [];
      this.children.set(parentId, siblings.filter(c => c !== node));
    }

    this.children.delete(id);
    this.map.delete(id);
    return true;
  }
  updateNodeId(oldKey: string, newKey: string) {
    const node = this.map.get(oldKey);
    if (!node) {
      debugPrint(`oldKey ${oldKey} is not in the map.`);
    }

    if (!node?.flags?.id) {
      throw new Error("node doesn't have id. shouldn't be possible in correct usage");
    }

    let children = this.children.get(node?.flags?.id);
    children?.forEach((child) => {
      taskSetFlag(child, "parent", newKey);
    })
    if (children) {
      this.children.delete(oldKey);
      this.children.set(newKey, children);
    }

    taskSetFlag(node, "id", newKey);

    this.map.delete(oldKey);
    this.map.set(newKey, node);

  }

  toString(): string {
    const lines: string[] = [];
    const visit = (task: Task): void => {
      lines.push(task.toString());
      const kids = this.children.get(task.flags?.id ?? "") ?? [];
      kids.forEach(visit);
    };
    this.roots.forEach(visit);
    return lines.join("\n");
  }
}

//TODO: rework to use maps?
export interface cacheMatchResult {
  match: boolean;
  toPost: Task[];
  toPut: Task[];
  toDelete: Task[]; // remote only — NOTE: just placeholder for now
}

export function cacheGenerateDiff(local: TaskCache, remote: TaskCache): cacheMatchResult {
  const result: cacheMatchResult = { match: true, toPost: [], toPut: [], toDelete: [] };

  const compareNode = (localTask: Task): void => {
    const id = localTask.flags?.id;
    if (!id) throw new Error("cacheMatch: Local task missing id.");

    const remoteTask = remote.map.get(id);

    if (!remoteTask) {
      // Exists locally but not remotely → POST
      result.match = false;
      result.toPost.push(localTask);
      local.children.get(id)?.forEach(child => collectAllAsPost(child));
      return;
    }

    if (!taskMatch(localTask, remoteTask)) {
      // Exists in both but different → PUT
      result.match = false;
      result.toPut.push(localTask);
    }

    local.children.get(id)?.forEach(compareNode);
  };

  const collectAllAsPost = (task: Task): void => {
    result.toPost.push(task);
    local.children.get(task.flags?.id ?? "")?.forEach(collectAllAsPost);
  };

  local.roots.forEach(compareNode);

  // Exists remotely but not locally → DELETE (optional)
  remote.map.forEach((remoteTask, id) => {
    if (!local.map.has(id)) {
      result.match = false;
      result.toDelete.push(remoteTask);
    }
  });

  return result;
}

export function createTask(name: string, parentId: string | null = null, id: string): Task {
  const flags = new TaskFlags();
  flags.id = id;
  flags.parent = parentId ?? "null";
  return new Task(name, 0, flags);
}

