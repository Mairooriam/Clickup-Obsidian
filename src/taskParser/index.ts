import { Lexer } from "./lexer.js"
import { Parser } from "./parser.js"
// import { TaskIndexer } from "./taskIndex.js"
// import type { TaskIndex } from "./taskIndex.js"
import * as t from "./serialization.js"

// export type { TaskIndex } from "./taskIndex.js"
export { Lexer } from "./lexer.js"
export { Parser } from "./parser.js"
// export { TaskIndexer } from "./taskIndex.js"

export * from "./serialization.js"
//TODO: switch to lodash-es
import lodash from "lodash";
const { isEqual } = lodash;
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
    [] Task with checkbox [status:review] [assignee:jane]
    `;

  const lexer = new Lexer(testInput);
  const tokens = lexer.tokenize();
  console.log(tokens);

}

export function testParser(): void {
  const testInput = `
    - Task 1 [id:abc123] [priority:high]
    \t- Task 1.1 [assignee:john] [status:pending]
    \t\t- Task 1.1.1 [type:bug] [urgent:true]
    - Task 2 [priority:low]
    [] Task with checkbox [status:review] [assignee:jane]
    `;

  const lexer = new Lexer(testInput);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  // console.log(tokens);
  const tasks = parser.parse();
  console.log(tasks);

}

testParser();

// // Default export for the main function
// export default parseTaskList;
