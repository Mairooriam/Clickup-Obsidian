import { Color, Colors } from "../utils/colors.js";

/**
 * Clickup uses userdefined statuses. user needs to map status in order to work with
 * taskParser
 * Populate `availableStatuses` by fetching statuses from the API at runtime,
 * then let the user pick which status corresponds to each state.
 */
export interface StatusMapping {
	/** Status string to use when Task.completed === true */
	completedStatus: string;
	/** Status string to use when Task.completed === false */
	activeStatus: string;
	/** All statuses available on the remote list, used to populate a picker */
	availableStatuses: string[];
}

/** Validate a raw Task object, throwing if required fields are missing or wrong type. */
export const TaskSchema = {
	parse(task: unknown): Task {
		if (!task || typeof task !== 'object') throw new Error('Task must be an object');
		const t = task as Record<string, unknown>;
		if (typeof t['id'] !== 'string') throw new Error(`id must be string, got ${typeof t['id']}`);
		if (typeof t['level'] !== 'number') throw new Error(`level must be number, got ${typeof t['level']}`);
		if (typeof t['striketrough'] !== 'boolean') throw new Error(`striketrough must be boolean, got ${typeof t['striketrough']}`);
		if (typeof t['name'] !== 'string') throw new Error(`name must be string, got ${typeof t['name']}`);
		if (typeof t['completed'] !== 'boolean') throw new Error(`completed must be boolean, got ${typeof t['completed']}`);
		return task as Task;
	},
	pick<K extends keyof Task>(keys: { [P in K]: true }) {
		return {
			partial() {
				return {
					parse(task: unknown): Partial<Pick<Task, K>> {
						if (!task || typeof task !== 'object') return {};
						const t = task as Record<string, unknown>;
						const result: Partial<Pick<Task, K>> = {};
						for (const key of Object.keys(keys) as K[]) {
							if (key in t) (result as Record<string, unknown>)[key] = t[key];
						}
						return result;
					}
				};
			}
		};
	}
};


export interface Team {
	id: string;
	name: string;
	spaces: Space[];
}

export interface Space {
	id: string;
	name: string;
	folders: Folder[];
}

export interface Folder {
	id: string;
	name: string;
	orderIndex: number;
	taskCount: string; //TODO: check if really string or if number is good?
	lists: List[];
}

// LISTS
export interface List {
	id: number;
	name: string;
	orderIndex: number;
	tasks: Task[];
}

// TASKS
export class Task {
	id: string;
	level: number; // used in display. not in clickup
	striketrough: boolean	// Internal
	name: string;
	color: Color; // used in display. not in clickup
	completed: boolean;
	parent?: string;
	top_level_parent?: string;

	constructor(id: string, level: number, name: string, color: Color = Colors.default, striketrough: boolean, completed: boolean) {
		this.id = id;
		this.level = level;
		this.name = name;
		this.color = color;
		this.striketrough = striketrough;
		this.completed = completed;
	}

	toString(): string {
		const indent = "\t".repeat(this.level);
		const parent = this.parent ? ` [parent:${this.parent}]` : "";
		let content = `${indent} - `;
		if (!this.completed) {
			content += "[ ] ";
		} else {
			content += "[x] ";
		}
		content += `${this.name} [id: ${this.id}]${parent} `;

		const displayContent = this.striketrough ? `~~${content} ~~` : content;

		if (this.color) {
			return `<span style = "color:${this.color};white-space:pre" > ${displayContent} </span>`;
		}
		return displayContent;
	}
}

export function tasksToString(tasks: Task[]): string {
	return tasks.map(t => t.toString()).join("\n");
}
