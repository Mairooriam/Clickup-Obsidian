
import { Parser } from "./parser.js"

import { tasksResolveParents, taskMatch, cacheGenerateDiff, TaskCache } from "./core.js"
import { ApiService, GetTasksOptions, CreateTaskOptions } from "./ApiService.js";
import { Lexer } from "./lexer.js"
import { ClickupTaskToTask, Task, tasksToString } from "./apiTypes/index.js"
import { Logger } from "./utils/logger.js";
import { Color, Colors } from "./utils/colors.js";



/**
 * Fetches all tasks (including subtasks) from a remote ClickUp list and returns them as a markdown string.
 *
 * @param {number} listId - The ClickUp list ID to fetch tasks from.
 * @param {ApiService} api - The API service instance used to make requests.
 * @returns {Promise<string>} A promise that resolves to the markdown string representation of the remote tasks.
 *
 * @remarks
 * If the request fails, an empty string is returned and an error is logged.
 */
export async function getRemote(listId: number, api: ApiService): Promise<string> {
	let options: GetTasksOptions = {};
	options.subtasks = true;
	try {
		const tasks = await api.getTasks(listId, options);
		Logger.log("taskParser.index", "Tasks:", tasks);
		let local = TaskCache.fromApi(tasks);
		Logger.log("taskParser.index", "Local cache", local)
		const cacheString = local.toString();
		Logger.log("taskParser.index", "Cache as string:", cacheString.toString());
		return local.toString();
	} catch (e) {
		//TODO: make logger differnelty since formatting bad for this logger.
		Logger.error("taskParser.index", "Failed to fetch remote tasks:", e);
		return "";
	}
}

/**
 * Computes the diff between a local TaskCache and the remote ClickUp list,
 * returns colored markdown.
 *
 * @param {TaskCache} cacheLocal - The local TaskCache parsed from markdown.
 * @param {number} remoteId - The ClickUp list ID to fetch remote tasks from.
 * @param {ApiService} api - The API service instance used to make requests.
 * @returns {Promise<string>} A promise that resolves to the colored markdown string representing the diff.
 *
 * @remarks
 * - New tasks are colored green.
 * - Updated tasks are colored blue.
 * - Deleted tasks are colored red.
 * - All other tasks are colored white.
 */
async function getColoredDiffMarkdown(localMd: string, remoteId: number, api: ApiService): Promise<string> {
	const cache = TaskCache.fromMarkdown(localMd);

	let options: GetTasksOptions = {};
	options.subtasks = true;
	const remote_tasks = await api.getTasks(remoteId, options);
	let cacheRemote = TaskCache.fromApi(remote_tasks);

	let diff = cacheGenerateDiff(cache, cacheRemote);

	cache.setColorForAll(Colors.White);
	diff.toPost.forEach(task => cache.setColorForSubtree(task.id, Colors.Green));
	diff.toPut.forEach(task => cache.setColorForSubtree(task.id, Colors.Blue));
	diff.toDelete.forEach(task => cache.setColorForSubtree(task.id, Colors.Red));

	return cache.toString();
}

/**
 * Sets the color for all tasks in the given markdown string.
 *
 * @param {string} md - The markdown string representing the tasks.
 * @param {Color} color - The color to apply to all tasks.
 * @returns {string} The markdown string with all tasks colored.
 *
 * @remarks
 * This function parses the markdown into a TaskCache, sets the color for all tasks,
 * and returns the updated markdown string.
 */
function setAllTasksColor(md: string, color: Color): string {
	let cache = TaskCache.fromMarkdown(md);
	cache.setColorForAll(color);
	return cache.toString();
}

export const TaskParser = {
	getRemote,
	getColoredDiffMarkdown,
	setAllTasksColor,
	TaskCache,
	Colors,
};
