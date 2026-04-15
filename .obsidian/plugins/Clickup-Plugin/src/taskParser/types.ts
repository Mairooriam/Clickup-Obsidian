export const SUPPORTED_FLAGS = new Set(['id', 'parent', "top_level_parent"]);
import { Task } from "./apiTypes/index.js"

export class TaskFlags {
	parent?: string;
	id?: string;
	top_level_parent?: string;


	[key: string]: any;
	toString(): string {
		return Object.entries(this)
			.filter(([key, value]) => !key.startsWith("_") && value !== undefined)
			.map(([key, value]) => `[${key}:${value}]`)
			.join(" ");
	}
}

//TODO: Task is now from apitypes index. make different task for displaiyng?
// Wrapper of task with level. scrap flags. add them to task if needed flag.
export class Task {
	name: string;
	level: number;
	flags?: TaskFlags | undefined;

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
export function taskMapClickupResponse(clickup_task: clickup_Task): Task {
	let task = new Task(clickup_task.name, 0);
	if (!task.flags) {
		task.flags = new TaskFlags();
	}
	task.flags.id = clickup_task.id ?? undefined;
	task.flags.parent = clickup_task.parent ?? undefined;
	task.flags.top_level_parent = clickup_task.top_level_parent ?? undefined;
	return task
}

export function taskMapClickupResponses(clickup_tasks: clickup_Task[]): Task[] {
	let tasks: Task[] = [];
	for (let i = 0; i < clickup_tasks.length; i++) {
		const clickup_task = clickup_tasks[i];
		if (clickup_task) {
			tasks.push(taskMapClickupResponse(clickup_task));
		}
	}

	return tasks;
}

export function tasksToString(tasks: Task[]): string {
	let result = "";
	for (let i = 0; i < tasks.length; i++) {
		const task = tasks[i];
		if (task) {
			result += task.toString() + "\n";
		}
	}
	return result
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
