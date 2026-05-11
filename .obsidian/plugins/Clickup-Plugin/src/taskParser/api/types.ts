import { Color, Colors } from "../utils/colors.js";
import { z } from "zod";

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

// TASKS
// Single source of truth: schema defines shape, type is derived from it.
export const TaskSchema = z.object({
	id: z.string(),
	level: z.number(),           // display only, not in clickup
	striketrough: z.boolean(),   // internal
	name: z.string(),
	color: z.string(),           // display only, not in clickup
	completed: z.boolean(),
	parent: z.string().optional(),
	topLevelParent: z.string().optional(),
	startDate: z.number().nullable(),
	dueDate: z.number().nullable(),
});

export type Task = z.infer<typeof TaskSchema>;

export function createTask(
	id: string,
	level: number,
	name: string,
	striketrough: boolean,
	completed: boolean,
	color: Color = Colors.default,
	startDate: number | null = null,
	dueDate: number | null = null,
): Task {
	return { id, level, name, striketrough, completed, color, startDate, dueDate };
}

export function taskToString(task: Task): string {
	//TODO: for now flags toString this way. in future list members that are flags and
	// iterate trough them? maybe serialize some info to yaml? idk?
	const indent = "\t".repeat(task.level);
	let content = `${indent} - `;
	content += task.completed ? "[x] " : "[ ] ";
	content += `${task.name}`;

	// Dynamic field serialization — keys must match Task/TaskSchema field names exactly
	const fields: Record<string, unknown> = {
		id: task.id,
		parent: task.parent,
		//		topLevelParent: task.topLevelParent,
		dueDate: task.dueDate,
		startDate: task.startDate,
	};
	for (const [key, value] of Object.entries(fields)) {
		if (value !== undefined && value !== null && value !== "" && value !== 0) {
			content += ` [${key}:${value}]`;
		}
	}

	const displayContent = task.striketrough ? `~~${content} ~~` : content;
	if (task.color) {
		return `<span style = "color:${task.color};white-space:pre" > ${displayContent} </span>`;
	}
	return displayContent;
}

export function tasksToString(tasks: Task[]): string {
	return tasks.map(taskToString).join("\n");
}

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

export type Team = z.infer<typeof TeamSchema>;
export type Space = z.infer<typeof SpaceSchema>;
export type Folder = z.infer<typeof FolderSchema>;
export type List = z.infer<typeof ListSchema>;

//TODO: Get rid of this re think parser
export const TaskFlagsSchema = TaskSchema.partial().extend({
	startDate: z.coerce.number().nullable().optional(),
	dueDate: z.coerce.number().nullable().optional(),
});

const TASK_EXCLUDE_FROM_MATCH_CLICKUP: readonly (keyof Task)[] = ["color", "level", "topLevelParent"];

const TASK_COMPARE_KEYS = (Object.keys(TaskSchema.shape) as (keyof Task)[])
	.filter(k => !TASK_EXCLUDE_FROM_MATCH_CLICKUP.includes(k));


//TODO: for now just for dueDate.
function normalizeField(key: keyof Task, value: Task[keyof Task]): unknown {
	if (key === "dueDate" || key === "startDate") return value || null;
	return value;
}

export function taskMatch(t1: Task, t2: Task): boolean {
	return TASK_COMPARE_KEYS.every(k => normalizeField(k, t1[k]) === normalizeField(k, t2[k]));
}


// USER
export interface User {
	id: number;
	username: string,
	email: string,
}


