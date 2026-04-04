import { Lexer } from "./lexer.js"
import { Parser } from "./parser.js"


import { cacheRemoveNonPlaceholderIds, resolveParents, cacheCollectRoots } from "./core.js"
export * from "./serialization.js"
//TODO: switch to lodash-es
import lodash from "lodash";
import { tasksToString, type TaskCache } from "./types.js";
const { isEqual } = lodash;
import { inspect } from "util";
import { readFile } from "fs/promises";
import { ApiService } from "./ApiService.js";
// export function parseTaskList(input: string): TaskIndex {
//     const lexer = new Lexer(input);
//     const parser = new Parser(lexer.tokenize());
//     const roots = parser.parse();
//     const indexer = new TaskIndexer();
//     return indexer.indexTasks(roots);
// }
//
// export function createTaskIndexer(): TaskIndexer {
//     return new TaskIndexer();
// }
//

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
  resolveParents(tasks);
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
  resolveParents(tasks);
  console.log("after toString\n\n", tasksToString(tasks));
}
export function testCollectRoots(): void {
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
  resolveParents(tasks);
  const cache: TaskCache = { rootNodes: [] };

  console.log("after collectRoots\n\n rootNodesCount:%d\n", cacheCollectRoots(cache, tasks));
  console.log(inspect(cache, { depth: null, colors: true }));
}


export function testRemoveNonPlaceholder() {
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
  resolveParents(tasks);
  const cache: TaskCache = { rootNodes: [] };
  cacheCollectRoots(cache, tasks);
  cacheRemoveNonPlaceholderIds(cache);
  console.log(inspect(cache, { depth: null, colors: true }));
}



export async function testClickupAPI() {
  const apiKey = await readFile("testApiKey", 'utf8');
  let api = ApiService.getInstance(apiKey);
  const teams = await api.getTeams();
  console.log("ClickupAPI\n\n ");
  console.log(inspect(teams, { depth: null, colors: true }));
  const teamId = teams.teams[0].id;
  const spaces = await api.getSpaces(teamId);
  console.log("Spaces \n\n", inspect(spaces, { depth: null, colors: true }));



}

testLexer();
testParser();
testIndex();
testToString();
testCollectRoots();
testRemoveNonPlaceholder();
testClickupAPI();

