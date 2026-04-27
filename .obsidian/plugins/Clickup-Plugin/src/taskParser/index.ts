
import { Parser } from "./parser.js"

import { tasksResolveParents, taskMatch, cacheGenerateDiff, TaskCache } from "./core.js"
import { ApiService, GetTasksOptions, CreateTaskOptions } from "./ApiService.js";
import { Lexer } from "./lexer.js"
import { ClickupTaskToTask, Task, tasksToString, Team, teamsToMarkdown, teamToMarkdown } from "./apiTypes/index.js"
import { Logger } from "./utils/logger.js";
import { Color, Colors } from "./utils/colors.js";
import { inspect } from "util";

export async function getRemoteFull(teamId: string, spaceId: string, folderId: string, listId: number, api: ApiService): Promise<string> {
	let team: Team | null = null;
	try {
		const teams = await api.getTeams();
		for (const _team of teams) {
			if (_team.id === teamId) {
				team = _team;
				break;
			}
		}

		if (!team) {
			Logger.error("core", `teamId: ${teamId} was not found on the remote`);
			return "";
		}

		let space = await api.getSpace(spaceId);
		if (!space) {
			Logger.error("core", `spaceId: ${spaceId} was not found on the remote`);
			return "";
		} else {
			team.spaces.push(space);
		}

		let folder = await api.getFolder(folderId);
		if (!folder) {
			Logger.error("core", `folderId: ${folderId} was not found on the remote`);
			return "";
		} else {
			folder.lists = folder.lists.filter((list: any) => list.id === listId);

			let options: GetTasksOptions = {};
			options.subtasks = true;
			let tasks = await api.getTasks(listId, options);
			if (!tasks) {
				Logger.error("core", `listId: ${listId} doesn't contain tasks`);
				return "";
			}
			if (folder.lists.length > 0) {
				folder.lists[0]!.tasks = tasks;
			}

			space.folders.push(folder);
		}

		// let local = TaskCache.fromApi(tasks);
		const result = teamToMarkdown(team);
		return result;
	} catch (e) {
		//TODO: make logger differnelty since formatting bad for this logger.
		Logger.error("taskParser.index", "Failed to fetch remote tasks:", e);
		return "";
	}
}
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
 * @param {string} localMd - Markdown of tasks
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

async function processDiffToPost(md: string, targetId: number, api: ApiService): Promise<string> {
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
	// ----------------- TO POST --------------------
	// NOTE: they wont have parent and it wont wait for response
	// to get it done faster
	if (diff.toPost.length) {
		const idMap = new Map<string, string>();
		console.time("push-new:create-remote");
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
	} else {
		Logger.log("core", "Nothing to post in local.");
	}

	// ----------------- TO PUT --------------------
	if (diff.toPut.length) {
		console.time("push-new:Put");
		await Promise.all(diff.toPut.map(async t => {
			const label = `push-new:Put:${t.name || ''}:${t.id}`;
			console.time(label);
			const response = await api.updateTask(t.id, t);
			console.timeEnd(label);
		}));
		console.timeEnd("push-new:Put");
	} else {
		Logger.log("core", "Nothing to put in local.");
	}

	// ----------------- TO PUT --------------------
	if (diff.toDelete.length) {
		console.time("push-new:Delete");
		await Promise.all(diff.toDelete.map(async t => {
			const label = `push-new:DeleteOne:${t.name || ''}:${t.id}`;
			console.time(label);
			const response = await api.deleteTask(t.id);
			console.timeEnd(label);
		}));
		console.timeEnd("push-new:Delete");
	} else {
		Logger.log("core", "Nothing to delete in loca.");
	}

	// ----------------- TO PUT --------------------
	//


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
	const parser = new Parser(tokens);
	const team = parser.parseFull();

	console.log(inspect(team, false, null));
}

testingLexer();

export const TaskParser = {
	getRemote,
	getRemoteFull,
	getColoredDiffMarkdown,
	setAllTasksColor,
	processDiffToPost,
	TaskCache,
	Colors,
};
