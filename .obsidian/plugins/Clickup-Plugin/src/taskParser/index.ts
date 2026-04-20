
import { Parser } from "./parser.js"

import { tasksResolveParents, taskMatch, cacheGenerateDiff, TaskCache } from "./core.js"
import { ApiService, GetTasksOptions, CreateTaskOptions } from "./ApiService.js";
import { Lexer } from "./lexer.js"
import { ClickupTaskToTask, Task, tasksToString } from "./apiTypes/index.js"



/**
 * Parse markdown into a TaskCache.
 */
export function parseTasksFromMarkdown(md: string): TaskCache {
	const lexer = new Lexer(md);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	const tasks = parser.parse();
	tasksResolveParents(tasks);
	return TaskCache.fromTasks(tasks);
}

/**
 * Convert a list of tasks to markdown.
 */
export function tasksToMarkdown(tasks: Task[]): string {
	return TaskCache.fromTasks(tasks).toString();
}

export function getFoldersEx(teamId: number, spaceId: number) {

}


export type { Task, TaskCache };
