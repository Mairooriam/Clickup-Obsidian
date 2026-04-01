import type { Token } from "./lexer.js"
import { TokenType } from "./lexer.js"
import type { Task } from "./types.js"
import { setTaskFlag } from "./types.js";

export class Parser {
  private tokens: Token[];
  private currentToken: Token;
  private currentIndex: number = 0;
  private idCounter = 0;

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

  private newTask(name: string, level: number, flags?: Record<string, string>): Task {
    const task: Task = {
      name,
      level,
    };

    if (flags && Object.keys(flags).length > 0) {
      for (const [flagName, flagValue] of Object.entries(flags)) {
        setTaskFlag(task, flagName, flagValue);
      }
    }

    return task;
  }

  parse(): Task[] {
    const allTasks: Task[] = [];
    const stack: { task: Task; indentLevel: number }[] = [];
    let idx = 0;
    while (!this.isToken(TokenType.EOF)) {

      if (this.isToken(TokenType.NEWLINE)) {
        this.next();
        idx = idx + 1;
        continue;
      }

      let indent = 0;
      if (this.isToken(TokenType.INDENT)) {
        indent = Number(this.currentToken.value);
        this.next();
      }

      if (!this.isToken(TokenType.DASH, TokenType.CHECKBOX)) {
        this.skipToNextLine();
        idx = idx + 1;
        continue;
      }

      this.next();

      if (!this.isToken(TokenType.TEXT)) {
        this.skipToNextLine();
        idx = idx + 1;
        continue;
      }

      allTasks.push(this.newTask(this.currentToken.value, indent, this.currentToken.flags));

      // console.log("%d iteration, on parser: ", idx, this.tokens);
    }

    return allTasks;
  }
}
