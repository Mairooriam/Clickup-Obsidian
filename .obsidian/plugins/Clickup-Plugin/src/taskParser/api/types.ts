import { Color, Colors } from "../utils/colors.js";

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
	parent?: string;
	top_level_parent?: string;

	constructor(id: string, level: number, name: string, color: Color = Colors.default, striketrough: boolean) {
		this.id = id;
		this.level = level;
		this.name = name;
		this.color = color;
		this.striketrough = striketrough;
	}

	toString(): string {
		const indent = "\t".repeat(this.level);
		const parent = this.parent ? ` [parent:${this.parent}]` : "";
		const content = `${indent}- ${this.name} [id:${this.id}]${parent}`;

		const displayContent = this.striketrough ? `~~${content}~~` : content;

		if (this.color) {
			return `<span style="color:${this.color};white-space:pre">${displayContent}</span>`;
		}
		return displayContent;
	}
}

export function tasksToString(tasks: Task[]): string {
	return tasks.map(t => t.toString()).join("\n");
}
