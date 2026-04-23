
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

async function pushDiff(md: string, targetId: number, api: ApiService): Promise<string> {
	console.time("push-new:parse-local");
	const local_cache = TaskCache.fromMarkdown(md);
	console.timeEnd("push-new:parse-local");

	console.time("push-new:get-remote");
	let options: GetTasksOptions = {};
	options.subtasks = true;
	const remote_tasks = await api.getTasks(targetId, options);
	let remote = TaskCache.fromApi(remote_tasks);
	console.timeEnd("push-new:get-remote");

	console.time("push-new:diff");
	let diff = cacheGenerateDiff(local_cache, remote);
	console.timeEnd("push-new:diff");

	console.time("push-new:create-remote");
	const idMap = new Map<string, string>();

	// Create all of the tasks from toPost
	// NOTE: they wont have parent and it wont wait for response
	// to get it done faster
	await Promise.all(diff.toPost.map(async t => {
		const label = `push-new:create-task:${t.name || ''}:${t.id}`;
		console.time(label);
		const op: CreateTaskOptions = {
			name: t.name,
			parent: null,
		};
		const response = await api.createTask(targetId, op);
		console.timeEnd(label);
		idMap.set(String(t.id), String(response.id));
	}));
	console.timeEnd("push-new:create-remote");

	// Update the tasks parents to match the previous step 
	console.time("push-new:update-remote");
	const updatePromises = diff.toPost
		.filter(t => t.parent)
		.map(async t => {
			const realId = idMap.get(String(t.id));
			const realParentId = idMap.get(String(t.parent));

			if (realId && realParentId) {
				await api.updateTaskParent(realId, realParentId);
			}
		});
	await Promise.all(updatePromises);
	console.timeEnd("push-new:update-remote");

	console.time("push-new:update-local-ids");
	for (const [localId, remoteId] of idMap.entries()) {
		local_cache.updateNodeId(localId, remoteId);
	}
	console.timeEnd("push-new:update-local-ids");

	return local_cache.toString();
}

function testingLexer() {
	const input = `
## [teams] TEAM [id:teamId]
### [spaces] SPACE [id:spaceId]
#### [folders] FOLDER [id:FolderId]
- [ ] Uncompleted Task
- [x] Completed Task
    `;
	const lexer = new Lexer(input);
	const tokens = lexer.tokenize();
	console.log(tokens);
}

testingLexer();

export const TaskParser = {
	getRemote,
	getColoredDiffMarkdown,
	setAllTasksColor,
	pushDiff,
	TaskCache,
	Colors,
};
