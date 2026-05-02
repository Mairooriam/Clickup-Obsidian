import { Color, Colors } from "../utils/colors.js";
import { z } from "zod";


export const TaskSchema = z.object({
	id: z.string(),
	level: z.number(),
	striketrough: z.boolean(),
	name: z.string(),
	color: z.any(), //TODO: this probably fine? right?
	completed: z.boolean(),
	parent: z.string().optional(),
	top_level_parent: z.string().optional(),
});

export const ListSchema = z.object({
	id: z.number(),
	name: z.string(),
	orderIndex: z.number(),
	tasks: z.array(TaskSchema),
});

export const FolderSchema = z.object({
	id: z.string(),
	name: z.string(),
	orderIndex: z.number(),
	taskCount: z.string(),
	lists: z.array(ListSchema),
});

export const SpaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	folders: z.array(FolderSchema),
});

export const TeamSchema = z.object({
	id: z.string(),
	name: z.string(),
	spaces: z.array(SpaceSchema),
});


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
