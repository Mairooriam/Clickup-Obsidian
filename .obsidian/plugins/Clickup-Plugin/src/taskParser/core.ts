import { Task } from "./api/types.js";
import { TaskSchema } from "./api/types.js";
import { generateId } from "./utils/id.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { Color, Colors } from "./utils/colors.js";
import { Logger } from "./utils/logger.js";
import { ApiService, CreateTaskOptions } from "./api/ApiService.js";
import { catchError } from "./utils/error.js";
import { TaskCache } from "./taskCache.js";

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
	console.log(listId);
	const [err, tasks] = await catchError(api.getTasks(listId));
	if (err) {
		Logger.error("taskParser.index", "getTasks failed with listId:", listId);
		throw err;
	}

	if (!tasks.length) {
		Logger.warn("core", "No tasks on remote.");
		return "";
	}

	Logger.log("taskParser.index", "Tasks:", tasks);
	let local = TaskCache.fromApi(tasks);
	Logger.log("taskParser.index", "Local cache", local)
	const cacheString = local.toString();
	Logger.log("taskParser.index", "Cache as string:", cacheString.toString());
	return local.toString();
}

export function isTask(line: string): Task | undefined {
	const lexer = new Lexer(line);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	const tasks = parser.parseTasks();

	if (!tasks) {
		Logger.error("taskParser.index", `failed to parse tasks from line: \"${line} \" `);
		return undefined;
	}

	if (tasks.length != 1) {
		Logger.error("taskParser.index", `${line} contained more than one task.`);
		return undefined;
	}

	return tasks[0];
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
export async function getColoredDiffMarkdown(localMd: string, remoteId: number, api: ApiService): Promise<string> {
	const cache = TaskCache.fromMarkdown(localMd);
	if (!cache) {
		Logger.warn("taskParser.index", "created empty cache.");
		return "";
	}
	Logger.log("taskParser.index", "Local cache: ", cache);

	const [err, remote_tasks] = await catchError(api.getTasks(remoteId));
	Logger.log("taskParser.index", "Remote Tasks: ", remote_tasks);
	console.log(remote_tasks);
	if (err) {
		Logger.warn("taskParser.index", "Didn't get any tasks from remote. retunring emppty.");
		return "";
	}

	let cacheRemote = TaskCache.fromApi(remote_tasks);
	Logger.log("taskParser.index", "remote: ", cacheRemote);

	let diff = cacheGenerateDiff(cache, cacheRemote);
	Logger.log("taskParser.index", "diff: ", diff);
	if (!diff.toDelete.length) {
		Logger.log("taskParser.index", "No tasks to color to delete (RED)");
	}
	if (!diff.toPost.length) {
		Logger.log("taskParser.index", "No tasks to color to post (GREEN)");
	}
	if (!diff.toPut.length) {
		Logger.log("taskParser.index", "No Tasks to color to put (BLUE)");
	}
	cache.setColorForAll(Colors.White);

	diff.toPost.forEach(task => cache.setColorForSubtree(task.id, Colors.Green));
	diff.toPut.forEach(task => cache.setColorForSubtree(task.id, Colors.Blue));
	diff.toDelete.forEach(task => cache.setColorForSubtree(task.id, Colors.Red));

	Logger.log("taskParser.index", "diff:", diff);
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
export function setAllTasksColor(md: string, color: Color): string {
	let cache = TaskCache.fromMarkdown(md);
	cache.setColorForAll(color);
	return cache.toString();
}

export async function processDiffToPost(md: string, targetId: number, api: ApiService): Promise<string> {
	console.time("push-new:parse-local");
	const local_cache = TaskCache.fromMarkdown(md);
	console.timeEnd("push-new:parse-local");

	console.time("push-new:get-remote");

	const [err, remote_tasks] = await catchError(api.getTasks(targetId));
	if (err) {
		return "";
	}

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
			const [err, response] = await catchError(api.createTask(targetId, op));
			if (!err) {
				console.timeEnd(label);
				idMap.set(String(t.id), String(response.id));
			} else {
				Logger.error("taskParser.index", "Failed to fetch create task. skipping.", t.toString());
			}
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
					//TODO: handle response?
					const [err, response] = await catchError(api.updateTaskParent(realId, realParentId));
					if (err) {
						Logger.error("taskParser.index", "Failed to update task parent. Skipping.", t.toString());
					}
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
			//TODO: handle response?
			const [err, response] = await catchError(api.updateTask(t.id, t));
			if (err) {
				Logger.error("taskParser.index", "Failed to update task. Skipping.", t.toString());
			}
			console.timeEnd(label);
		}));
		console.timeEnd("push-new:Put");
	} else {
		Logger.log("core", "Nothing to put in local.");
	}

	// ----------------- TO DELETE --------------------
	if (diff.toDelete.length) {
		console.time("push-new:Delete");
		await Promise.all(diff.toDelete.map(async t => {
			const label = `push-new:DeleteOne:${t.name || ''}:${t.id}`;
			console.time(label);
			const [err, response] = await catchError(api.deleteTask(t.id));
			if (err) {
				Logger.error("taskParser.index", "Failed to deleteTask. Skipping", t.toString());
			}
			console.timeEnd(label);
			local_cache.removeNode(t.id);
		}));
		console.timeEnd("push-new:Delete");
	} else {
		Logger.log("core", "Nothing to delete in local.");
	}

	return local_cache.toString();
}


// tells whether two tasks are the same
export function taskMatch(t1: Task, t2: Task): boolean {
	if (t1.name !== t2.name) return false;
	if (t1.id !== t2.id) return false;
	if (t1.parent !== t2.parent) return false;
	return true;
}

//TODO: rework to use maps?
export interface cacheMatchResult {
	match: boolean;
	toPost: Task[];
	toPut: Task[];
	toDelete: Task[]; // remote only — NOTE: just placeholder for now
}

function cacheGenerateDiff(local: TaskCache, remote: TaskCache): cacheMatchResult {
	const result: cacheMatchResult = { match: true, toPost: [], toPut: [], toDelete: [] };

	const compareNode = (localTask: Task): void => {
		const id = localTask.id;
		if (!id) throw new Error("cacheMatch: Local task missing id.");

		const remoteTask = remote.map.get(id);

		if (localTask.striketrough) {
			if (remoteTask) {
				result.match = false;
				result.toDelete.push(localTask);
			}
			return;
		}
		if (remoteTask && localTask.completed !== remoteTask.completed) {
			result.match = false;
			result.toPut.push(localTask);
		}

		if (!remoteTask) {
			// Exists locally but not remotely → POST
			result.match = false;
			result.toPost.push(localTask);
			local.children.get(id)?.forEach(child => collectAllAsPost(child));
			return;
		}

		if (!taskMatch(localTask, remoteTask)) {
			// Exists in both but different → PUT
			result.match = false;
			result.toPut.push(localTask);
		}

		local.children.get(id)?.forEach(compareNode);
	};

	const collectAllAsPost = (task: Task): void => {
		// Do not post tasks marked for deletion
		if (task.striketrough) return;
		result.toPost.push(task);
		local.children.get(task.id ?? "")?.forEach(collectAllAsPost);
	};

	local.roots.forEach(compareNode);

	// Exists remotely but not locally → DELETE (optional)
	remote.map.forEach((remoteTask, id) => {
		if (!local.map.has(id)) {
			result.match = false;
			result.toDelete.push(remoteTask);
		}
	});

	return result;
}


export function parseTask(md: string): Task | undefined {
	const lexer = new Lexer(md);
	const parser = new Parser(lexer.tokenize());
	const tasks = parser.parseTasks();
	if (tasks.length !== 1) {
		Logger.error("taskParser.index", "Parsing task found more than 1 task.");
	} else {
		return tasks[0]!;
	}
	return undefined;
}



export function tokenizeAndLog(md: string) {
	console.log(md);
	const lexer = new Lexer(md);
	const tokens = lexer.tokenize();
	console.log(tokens);
	const parser = new Parser(tokens);
	const tasks = parser.parseTasks();
	console.log(tasks);
}


