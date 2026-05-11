import { Task, TaskSchema, taskToString } from "./api/types";
import { Stack } from "./core";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Color } from "./utils/colors";
import { generateId } from "./utils/id";
import { Logger } from "./utils/logger";

function recalculateLevels(cache: TaskCache): void {
	const visit = (task: Task, level: number): void => {
		task.level = level;
		cache.children.get(task.id)?.forEach(child => visit(child, level + 1));
	};
	cache.roots.forEach(root => visit(root, 0));
}
function tasksResolveParents(tasks: Task[], idGenerator: () => string = generateId): void {
	// Assign placeholder IDs if missing
	for (const task of tasks) {
		if (!task) continue;
		if (!task.id) {
			task.id = idGenerator();
		}
	}

	// Assign parent IDs using a stack
	const stack = new Stack<Task>();
	for (const task of tasks) {
		while (stack.top() && stack.top()!.level >= task.level) {
			stack.pop();
		}
		if (!stack.empty()) {
			task.parent = stack.top()!.id;
		} else {
			task.parent = undefined;
		}
		stack.push(task);
	}
}

export class TaskCache {
	map: Map<string, Task> = new Map();
	children: Map<string, Task[]> = new Map();
	roots: Task[] = [];

	constructor() {
		this.roots = [];
		this.map = new Map();
		this.children = new Map();
	}
	/**
	 * Creates a deep copy of this TaskCache.
	 * @returns {TaskCache} A new TaskCache instance with the same data.
	 */
	clone(): TaskCache {
		// Use toString and fromMarkdown for a deep copy.
		return TaskCache.fromMarkdown(this.toString());
	}

	/**
	 * Build a TaskCache tree from a flat array of tasks.
	 * 
	 * @param tasks Flat array of Task objects.
	 * @param resolveParents If true, parent relationships are recalculated using `tasksResolveParents` (for tasks parsed from markdown, where parent/level must be inferred).
	 *                       If false, parent relationships are assumed to be already set (e.g., tasks from API).
	 * @returns TaskCache instance representing the task tree.
	 */
	private static fromTasks(tasks: Task[], resolveParents = true): TaskCache {
		//TODO: add validation on calls in public layer for this
		tasks.forEach((task, idx) => {
			try {
				TaskSchema.parse(task);
			} catch (e) {
				const errMsg = e instanceof Error ? e.message : String(e);
				throw new Error(`Task validation failed at index ${idx} (id: ${task.id ?? 'unknown'}): ${errMsg}`);
			}
		});
		if (resolveParents) {
			tasksResolveParents(tasks);
		}
		const tree = new TaskCache();
		const allIds = new Set(tasks.map(t => t.id));
		const dangling: Task[] = [];

		for (const task of tasks) {
			const id = task.id;
			if (id) tree.map.set(id, task);
		}

		for (const task of tasks) {
			const parentId = task.parent;
			if (!parentId || parentId === "null") {
				tree.roots.push(task);
			} else {
				if (!allIds.has(parentId)) {
					dangling.push(task);
				}
				if (!tree.children.has(parentId)) tree.children.set(parentId, []);
				tree.children.get(parentId)!.push(task);
			}
		}

		if (tree.roots.length === 0 && tasks.length > 0) {
			Logger.warn(
				"core",
				"API returned tasks but none are roots (all have a parent). This may indicate a data or conversion issue. or sometimes clickup leaves hanging \"ghost\" tasks",
				{ tasks: tasks.map(t => ({ id: t.id, name: t.name, parent: t.parent })) }
			);
		}

		if (dangling.length > 0) {
			Logger.warn(
				"core",
				"Detected dangling tasks: these have a parent that does not exist in the task list.",
				{ dangling: dangling.map(t => ({ id: t.id, name: t.name, parent: t.parent })) }
			);
		}

		recalculateLevels(tree);
		return tree;
	}

	/**
	 * Create a TaskCache from an array of tasks returned by the API.
	 *
	 * @param tasks Flat array of Task objects from the API. These tasks are expected to already have correct `parent` fields set.
	 * @returns TaskCache instance representing the task tree.
	 *
	 * This method does NOT recalculate parent relationships. Use this for tasks loaded from the API, where parent/level information is already present.
	 */
	static fromApi(tasks: Task[]): TaskCache {
		return this.fromTasks(tasks, false);
	}

	/**
	 * Create a TaskCache from a markdown string.
	 *
	 * @param md Markdown string containing task definitions.
	 * @returns TaskCache instance representing the task tree.
	 *
	 * This method parses the markdown, infers parent relationships and levels, and builds the task tree accordingly.
	 */
	static fromMarkdown(md: string): TaskCache {
		const lexer = new Lexer(md);
		const parser = new Parser(lexer.tokenize());
		const tasks = parser.parseTasks();
		return this.fromTasks(tasks, true);
	}

	addNode(task: Task): boolean {
		if (this.map.has(task.id)) return false;

		const parentId = task.parent;
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

		this.map.set(task.id, task);
		return true;
	}

	removeNode(id: string): boolean {
		const node = this.map.get(id);
		if (!node) return false;

		const parentId = node.parent;

		const nodeChildren = this.children.get(id) ?? [];

		// reparent children
		for (const child of nodeChildren) {
			if (!parentId || parentId === "null") {
				child.parent = "null";
				child.level = 0;
				this.roots.push(child);
			} else {
				child.parent = parentId;
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
		recalculateLevels(this);
		return true;
	}
	updateNodeId(oldKey: string, newKey: string) {
		const node = this.map.get(oldKey);
		if (!node) {
			Logger.log("core", `${oldKey} is not in the map.`);
		}

		if (!node?.id) {
			throw new Error("node doesn't have id. shouldn't be possible in correct usage");
		}

		let children = this.children.get(node.id);
		children?.forEach((child) => {
			child.parent = newKey;
		})
		if (children) {
			this.children.delete(oldKey);
			this.children.set(newKey, children);
		}

		node.id = newKey;
		this.map.delete(oldKey);
		this.map.set(newKey, node);

	}

	toString(): string {
		const lines: string[] = [];
		const visit = (task: Task): void => {
			lines.push(taskToString(task));
			const kids = this.children.get(task.id ?? "") ?? [];
			kids.forEach(visit);
		};
		this.roots.forEach(visit);
		return lines.join("\n");
	}

	setColorForAll(color: Color): void {
		this.map.forEach(task => task.color = color);
	}

	setColorForSubtree(id: string, color: Color): void {
		const task = this.map.get(id);
		if (!task) return;
		task.color = color;
		this.children.get(id)?.forEach(child => this.setColorForSubtree(child.id, color));
	}
}

