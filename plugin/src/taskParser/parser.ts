import type { Token } from "./lexer.js"
import { TokenType } from "./lexer.js"
import { Task } from "./types.js"
import { taskSetFlag } from "./core.js";

export class Parser {
  private tokens: Token[];
  private currentToken: Token;
  private currentIndex: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.currentToken = this.tokens[this.currentIndex] || { type: TokenType.EOF, value: "", row: 0, col: 0 };
  }

  private next(): void {
    this.currentIndex++;
    this.currentToken = this.tokens[this.currentIndex] || { type: TokenType.EOF, value: "", row: 0, col: 0 };
  }

  private isToken(...types: TokenType[]): boolean {
    return types.includes(this.currentToken.type);
  }

  private skipToNextLine(): void {
    while (!this.isToken(TokenType.NEWLINE, TokenType.EOF)) {
      this.next();
    }
    if (this.isToken(TokenType.NEWLINE)) this.next();
  }


  parse(): Task[] {
    const allTasks: Task[] = [];
    while (!this.isToken(TokenType.EOF)) {

      if (this.isToken(TokenType.NEWLINE)) {
        this.next();
        continue;
      }

      let indent = 0;
      if (this.isToken(TokenType.INDENT)) {
        indent = Number(this.currentToken.value);
        this.next();
      }

      if (!this.isToken(TokenType.DASH)) {
        this.skipToNextLine();
        continue;
      }

      this.next();

      // TODO: placeholder. waiting for future checkbox support for completing the tasks
      // let completed = false;
      // if (this.isToken(TokenType.CHECKBOX_COMPLETED)) {
      //   completed = true;
      //
      // }
      if (this.isToken(TokenType.CHECKBOX_COMPLETED, TokenType.CHECKBOX_EMPTY)) {
        this.next();
      }

      if (!this.isToken(TokenType.TEXT)) {
        this.skipToNextLine();
        continue;
      }

    const task = new Task(this.currentToken.value, indent);
      if (this.currentToken.flags) {
        for (const [flagName, flagValue] of Object.entries(this.currentToken.flags)) {
          taskSetFlag(task, flagName, flagValue);
        }
      }

      allTasks.push(task);
    }

    return allTasks;
  }
}
