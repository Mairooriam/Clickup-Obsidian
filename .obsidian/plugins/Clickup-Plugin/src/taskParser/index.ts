
import { Parser } from "./parser.js"
import { readFile, writeFile, access } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";


// cacheBuildTaskCache
import { tasksResolveParents, taskMatch, cacheGenerateDiff, createTask, TaskCache } from "./core.js"
//skTODO: switch to lodash-es
// import lodash, { forEach } from "lodash";
import { tasksToString } from "./types.js";
// const { isEqual } = lodash;
import { inspect } from "util";
import { ApiService, GetTasksOptions, CreateTaskOptions } from "./ApiService.js";
import { Task, taskMapClickupResponses } from "./types.js"
import { Lexer } from "./lexer.js"

//TODO: make proper unit tests
export function testLexer(): void {
	const testInput = `
    - Task 1 [id:abc123] [priority:high]
    \t- Task 1.1 [assignee:john] [status:pending]
    \t\t- Task 1.1.1 [type:bug] [urgent:true]
    - Task 2 [priority:low]
    - [ ] uncompleted test [status:review] [assignee:jane]
    - [x] completed test [status:review]
`;

	const lexer = new Lexer(testInput);
	const tokens = lexer.tokenize();
	console.log("Tesing Lexer.");
	console.log(tokens);

}

export function testParser(): void {
	const testInput = `
- Task 1 [id:abc123] [priority:high]
\t- Task 1.1 [assignee:john] [status:pending]
\t- Task2 1.1
\t\t- Task 1.1.1 [type:bug] [urgent:true]
- Task 2 [priority:low]
\t- Task 2.2
\t- Task2 2.2
- [ ] Task with checkbox uncompleted [status:review] [assignee:jane]
- [x] Task with checkbox completed [status:review] [assignee:jane]
    `;

	const lexer = new Lexer(testInput);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	// console.log(tokens);
	const tasks = parser.parse();
	console.log("Testing Parser.");
	console.log(tasksToString(tasks));

}

export function testResolveParents(): void {
	const testInput = `
- Task 1 [id:abc123] [priority:high]
\t- Task 1.1 [assignee:john] [status:pending]
\t- Task2 1.1
\t\t- Task 1.1.1 [type:bug] [urgent:true]
- Task 2 [priority:low]
\t- Task 2.2
\t- Task2 2.2
- [ ] Task with checkbox uncompleted [status:review] [assignee:jane]
- [x] Task with checkbox completed [status:review] [assignee:jane]
    `;

	const lexer = new Lexer(testInput);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	// console.log(tokens);
	const tasks = parser.parse();
	tasksResolveParents(tasks);
	console.log("after indexing\n", tasksToString(tasks));
}

export function testToString(): void {
	const testInput = `
    - Task 1 [id:abc123] [priority:high]
    \t- Task 1.1 [assignee:john] [status:pending]
    \t\t- Task 1.1.1 [type:bug] [urgent:true]
    - Task 2 [priority:low]
    - [ ] Task with checkbox uncompleted [status:review] [assignee:jane]
    - [x] Task with checkbox completed [status:review] [assignee:jane]

    `;

	const lexer = new Lexer(testInput);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	// console.log(tokens);
	const tasks = parser.parse();
	tasksResolveParents(tasks);
	console.log("after toString\n\n", tasksToString(tasks));
}

export async function testClickupAPI() {
	const apiKey = await readFile("testApiKey", 'utf8');
	let api = ApiService.getInstance(apiKey);
	const teams = await api.getTeams();
	console.log("ClickupAPI\n\n ");
	console.log(inspect(teams, { depth: null, colors: true }));
	const teamId = teams[0]!.id;
	const spaces = await api.getSpaces(teamId);
	console.log("Spaces \n\n", inspect(spaces, { depth: null, colors: true }));
	const spaceId = spaces[0]!.id;
	console.log(spaceId);
	const folders = await api.getFolders(spaceId)
	// console.log(folders[0]!.lists);

	let options: GetTasksOptions = {};
	options.subtasks = true;
	const tasks = await api.getTasks("901522227733", options);
	console.log(tasks);
	// console.log(tasks.last_page);
}

export async function testMapClickupResponseToTasks(): Promise<Task[]> {
	const apiKey = await readFile("testApiKey", 'utf8');
	let api = ApiService.getInstance(apiKey);
	const teams = await api.getTeams();
	console.log("ClickupAPI\n\n ");
	console.log(inspect(teams, { depth: null, colors: true }));
	const teamId = teams[0]!.id;
	const spaces = await api.getSpaces(teamId);
	console.log("Spaces \n\n", inspect(spaces, { depth: null, colors: true }));
	const spaceId = spaces[0]!.id;
	console.log(spaceId);
	const folders = await api.getFolders(spaceId)
	// console.log(folders[0]!.lists);

	let options: GetTasksOptions = {};
	options.subtasks = true;
	const _tasks = await api.getTasks("901522227733", options);

	let tasks = taskMapClickupResponses(_tasks);
	console.log(tasksToString(tasks));

	return tasks;
}

export function testCache(tasks: Task[]): void {
	let taskCache = TaskCache.fromTasks(tasks);
	console.log("testCache\n\n", taskCache);
	console.log("testCache User input\n\n", taskCache.toString());
}

export function testCacheFromUserMd() {
	const testInput = `
    - Task 1 [id:abc123] [priority:high]
    \t- Task 1.1 [assignee:john] [status:pending]
    \t\t- Task 1.1.1 [type:bug] [urgent:true]
    - Task 2 [priority:low]
    - [ ] Task with checkbox uncompleted [status:review] [assignee:jane]
    - [x] Task with checkbox completed [status:review] [assignee:jane]

    `;

	const lexer = new Lexer(testInput);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	// console.log(tokens);
	const tasks = parser.parse();
	tasksResolveParents(tasks);

	// let taskCache = cacheBuildTaskCache(tasks);
	let taskCache = TaskCache.fromTasks(tasks)
	console.log("testCache User input\n\n", taskCache);

}


export function testDiffChecker() {
	const local_input = `
  - Task 2 [_brand:TaskFlags] [parent:null] [id:86c8wek01] [top_level_parnet:null]
  \t- Task 2.2 [_brand:TaskFlags] [parent:86c8wek01] [id:86c96ey3c] [top_level_parnet:86c8wek01]
  - Task 1 [_brand:TaskFlags] [parent:null] [id:86c8we387] [top_level_parnet:null]
  \t- Task 1.1 [_brand:TaskFlags] [parent:86c8we387] [id:86c8we3av] [top_level_parnet:86c8we387]
  - Task 3
  \t- Task 3.3
    `;
	const remote_input = `
  - Task 2 [_brand:TaskFlags] [parent:null] [id:86c8wek01] [top_level_parnet:null]
  \t- Task 2.2 [_brand:TaskFlags] [parent:86c8wek01] [id:86c96ey3c] [top_level_parnet:86c8wek01]
  - Task 1 [_brand:TaskFlags] [parent:null] [id:86c8we387] [top_level_parnet:null]
  \t- Task 1.1 [_brand:TaskFlags] [parent:86c8we387] [id:86c8we3av] [top_level_parnet:86c8we387]
  `;

	const local_lexer = new Lexer(local_input);
	const remote_lexer = new Lexer(remote_input);
	const local_tokens = local_lexer.tokenize();
	const remote_tokens = remote_lexer.tokenize();

	const local_parser = new Parser(local_tokens);
	const remote_parser = new Parser(remote_tokens);

	// console.log(tokens);
	let local_tasks = local_parser.parse();
	tasksResolveParents(local_tasks);
	const remote_tasks = remote_parser.parse();

	// let local_cache = cacheBuildTaskCache(local_tasks);
	// let remote_cache = cacheBuildTaskCache(remote_tasks);
	let local_cache = TaskCache.fromTasks(local_tasks);
	let remote_cache = TaskCache.fromTasks(remote_tasks);
	console.log("Compare result\n\n", taskMatch(local_cache.roots[0]!, remote_cache.roots[0]!)
	)
	console.log("Compare caches\n\n", inspect(cacheGenerateDiff(local_cache, remote_cache), false, null));

}

export function cacheCreateFromMd(md: string): TaskCache {
	const lexer = new Lexer(md);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	const tasks = parser.parse();
	tasksResolveParents(tasks);
	return TaskCache.fromTasks(tasks);
}

export async function testWorkFlow() {
	// get user spaces, teams, folders, etc.
	const apiKey = await readFile("testApiKey", 'utf8');
	let api = ApiService.getInstance(apiKey);
	const teams = await api.getTeams();
	const teamId = teams[0]!.id;
	const spaces = await api.getSpaces(teamId);
	const spaceId = spaces[0]!.id;
	const folders = await api.getFolders(spaceId)
	const folder = folders.find((f: any) => f.name === "Projects");
	if (!folder) throw new Error("Folder not found");
	console.log("Found folder:", folder);
	console.log("Lists in folder:", folder.lists);
	const list = folder.lists.find((f: any) => f.name === "API_test_lista");
	if (!list) throw new Error("list not found");
	console.log("Found list: name:%s id:%s", list.name, list.id);

	// fetch intial remote "becomes local"
	let options: GetTasksOptions = {};
	options.subtasks = true;

	// Check if cache exists, if not fetch from remote and create it
	let local_cache: TaskCache;

	// if (!cacheExists) {
	//   console.log("Cache not found, fetching from remote and creating cache.md...");
	const _tasks = await api.getTasks(list.id, options);
	let tasks = taskMapClickupResponses(_tasks);
	local_cache = TaskCache.fromTasks(tasks);
	//   const cacheString = local_cache.toString();
	//   const now = new Date();
	//   const timestampHeader = `# Cache generated at: ${now.toISOString()}\n\n`;
	//   await writeFile(cachePath, timestampHeader + cacheString, "utf8");
	//   console.log("Cache saved to cache.md");
	// } else {
	//   console.log("Cache found, loading from cache.md...");
	//   const localChange = await readFile(cachePath, "utf8");
	//   local_cache = cacheCreateFromMd(localChange);
	// }

	console.log(local_cache.toString());
	// Get Remote for diff checking
	const _remote_tasks = await api.getTasks(list.id, options);
	let remote_tasks = taskMapClickupResponses(_remote_tasks);
	// let remote = cacheBuildTaskCache(remote_tasks);
	let remote = TaskCache.fromTasks(remote_tasks);
	// Generate Diff
	let diff = cacheGenerateDiff(local_cache, remote);
	const list_id: number = 901522227733;
	for (const post of diff.toPost) {
		let t: Task = post;
		console.log("before post\n\n,", local_cache.toString());
		const op: CreateTaskOptions = {
			name: t.name,
			parent: t.flags?.parent ?? null,
		};
		const response = await api.createTask(list_id, op)
		// const response = await api.createTaskTemp(list_id, op);

		if (!t.flags?.id) {
			throw new Error("shouldn't happen. Check code that the usage is valid");
		}
		const oldKey = String(t.flags.id);
		const newKey = String(response.id);

		local_cache.updateNodeId(oldKey, newKey);
	}
	// console.log(inspect(local_cache.toString(), false, null));
	console.log(local_cache.toString());
	// console.log("name:%s, id:%s dat_created:%s list%s, url%s", r.name, r.id, r.date_created, r.list, r.url);
	// console.log(inspect(diff, false, null));
	// Push diff

}

export function testCacheMethods() {
	const testInput = `
  - Task 2 [_brand:TaskFlags] [parent:null] [id:86c8wek01] [top_level_parnet:null]
  \t- Task 2.2 [_brand:TaskFlags] [parent:86c8wek01] [id:86c96ey3c] [top_level_parnet:86c8wek01]
  - Task 1 [_brand:TaskFlags] [parent:null] [id:86c8we387] [top_level_parnet:null]
  \t- Task 1.1 [_brand:TaskFlags] [parent:86c8we387] [id:86c8we3av] [top_level_parnet:86c8we387]
  \t- Task2 1.1 [id:hello]
  - Task 3
  \t- Task 3.3
    `;

	const lexer = new Lexer(testInput);
	const tokens = lexer.tokenize();
	const parser = new Parser(tokens);
	const tasks = parser.parse();
	tasksResolveParents(tasks);
	const cache = TaskCache.fromTasks(tasks);
	console.log("Hello from cache \n", cache);
	// console.log(iespect(cache.roots, { depth: 5, colors: true }));
	cache.addNode(createTask("testName", null, "testId"));
	cache.addNode(createTask("addingChild", "testId", "child"));
	cache.addNode(createTask("testName2", "child", "child2"));
	cache.addNode(createTask("testName3", "child", "child3"));

	console.log("Hello from cache before remove\n", cache);
	cache.removeNode("child");
	console.log("Hello from cache after remove \n", cache);
	console.log(inspect(cache.toString(), { colors: true }));
	console.log(cache.toString());


	cache.updateNodeId("testId", "newTestId");
	console.log("\n\n\n", cache.toString());

}

export function testDiffColor() {
	//TODO: add color to diff.
	//OK color -> ???
	//Added -> green
	//Removed -> Red
	//Editred -> blue

}


//
// testLexer();
// testParser();
// testResolveParents();
// testToString();
//  testClickupAPI();
// testMapClickupResponseToTasks();
// testCache(await testMapClickupResponseToTasks())
// testCacheFromUserMd();
testDiffChecker();
// testWorkFlow();
// testCacheUtils();
// testCacheMethods();

