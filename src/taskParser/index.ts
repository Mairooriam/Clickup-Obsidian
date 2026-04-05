import { Lexer } from "./lexer.js"
import { Parser } from "./parser.js"


import { tasksResolveParents, taskMapClickupResponses, cacheBuildTaskCache, cacheBuildString, taskMatch, cacheMatch } from "./core.js"
export * from "./serialization.js"
//skTODO: switch to lodash-es
import lodash from "lodash";
import { tasksToString, type TaskCache } from "./types.js";
const { isEqual } = lodash;
import { inspect } from "util";
import { readFile } from "fs/promises";
import { ApiService, GetTasksOptions } from "./ApiService.js";
import { Task } from "./types.js"

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
  console.log("Testing Parser.");
  console.log(tasks);

}

export function testIndex(): void {
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
  console.log("after indexing\n", tasks);
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
// export function testCollectRoots(): void {
//   const testInput = `
//     - Task 1 [id:abc123] [priority:high]
//     \t- Task 1.1 [assignee:john] [status:pending]
//     \t\t- Task 1.1.1 [type:bug] [urgent:true]
//     - Task 2 [priority:low]
//     - [ ] Task with checkbox uncompleted [status:review] [assignee:jane]
//     - [x] Task with checkbox completed [status:review] [assignee:jane]
//
//     `;
//
//   const lexer = new Lexer(testInput);
//   const tokens = lexer.tokenize();
//   const parser = new Parser(tokens);
//   // console.log(tokens);
//   const tasks = parser.parse();
//   tasksResolveParents(tasks);
//   const cache: TaskCache = { rootNodes: [] };
//
//   console.log("after collectRoots\n\n rootNodesCount:%d\n", cacheCollectRoots(cache, tasks));
//   console.log(inspect(cache, { depth: null, colors: true }));
// }


// export function testRemoveNonPlaceholder() {
//   const testInput = `
//     - Task 1 [id:abc123] [priority:high]
//     \t- Task 1.1 [assignee:john] [status:pending]
//     \t\t- Task 1.1.1 [type:bug] [urgent:true]
//     - Task 2 [priority:low]
//     - [ ] Task with checkbox uncompleted [status:review] [assignee:jane]
//     - [x] Task with checkbox completed [status:review] [assignee:jane]
//
//     `;
//
//   const lexer = new Lexer(testInput);
//   const tokens = lexer.tokenize();
//   const parser = new Parser(tokens);
//   // console.log(tokens);
//   const tasks = parser.parse();
//   tasksResolveParents(tasks);
//   const cache: TaskCache = { rootNodes: [] };
//   cacheCollectRoots(cache, tasks);
//   cacheRemoveNonPlaceholderIds(cache);
//   console.log(inspect(cache, { depth: null, colors: true }));
// }



export async function testClickupAPI() {
  const apiKey = await readFile("testApiKey", 'utf8');
  let api = ApiService.getInstance(apiKey);
  const teams = await api.getTeams();
  console.log("ClickupAPI\n\n ");
  console.log(inspect(teams, { depth: null, colors: true }));
  const teamId = teams.teams[0].id;
  const spaces = await api.getSpaces(teamId);
  console.log("Spaces \n\n", inspect(spaces, { depth: null, colors: true }));
  const spaceId = spaces.spaces[0].id;
  console.log(spaceId);
  const folders = await api.getFolders(spaceId)
  console.log(folders.folders[0].lists);

  let options: GetTasksOptions = {};
  options.subtasks = true;
  const tasks = await api.getTasks("901522227733", options);
  console.log(tasks);
  console.log(tasks.last_page);
}

export async function testMapClickupResponseToTasks(): Promise<Task[]> {
  const apiKey = await readFile("testApiKey", 'utf8');
  let api = ApiService.getInstance(apiKey);
  const teams = await api.getTeams();
  console.log("ClickupAPI\n\n ");
  console.log(inspect(teams, { depth: null, colors: true }));
  const teamId = teams.teams[0].id;
  const spaces = await api.getSpaces(teamId);
  console.log("Spaces \n\n", inspect(spaces, { depth: null, colors: true }));
  const spaceId = spaces.spaces[0].id;
  console.log(spaceId);
  const folders = await api.getFolders(spaceId)
  console.log(folders.folders[0].lists);

  let options: GetTasksOptions = {};
  options.subtasks = true;
  const _tasks = await api.getTasks("901522227733", options);

  let tasks = taskMapClickupResponses(_tasks.tasks);
  console.log(tasksToString(tasks));

  return tasks;
}

export function testCache(tasks: Task[]): void {
  let taskCache = cacheBuildTaskCache(tasks);

  console.log("testCache\n\n", taskCache);
  console.log("testCache User input\n\n", cacheBuildString(taskCache));
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

  let taskCache = cacheBuildTaskCache(tasks);
  console.log("testCache User input\n\n", taskCache);

}


export function testDiffChecker() {
  const local_input = `
    - Task 1 [id:abc123] [priority:high]
    \t- Task 1.1 [id:abc124] [assignee:john] [status:pending]
    - Task 2
    \t- Task 2.2
    `;
  const remote_input = `
    - Task 1 [id:abc123] [priority:high]
    \t- Task 1.1 [id:abc124] [assignee:john] [status:pending]
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



  let local_cache = cacheBuildTaskCache(local_tasks);
  let remote_cache = cacheBuildTaskCache(remote_tasks);

  console.log("Compare result\n\n", taskMatch(local_cache.roots[0], remote_cache.roots[0])
  )
  console.log("Compare caches\n\n", inspect(cacheMatch(local_cache, remote_cache), false, null));

}
// testLexer();
// testParser();
// testIndex();
// testToString();
// testCollectRoots();
// testRemoveNonPlaceholder();
// testClickupAPI();
// testMapClickupResponseToTasks();
testCache(await testMapClickupResponseToTasks())
// testCacheFromUserMd();
testDiffChecker();

