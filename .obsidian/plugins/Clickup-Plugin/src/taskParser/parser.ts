import type { Token } from "./lexer.js"
import { TokenType } from "./lexer.js"
import { Task } from "./apiTypes/index.js"
import { generateId } from "./id.js";


function taskFromToken(id: string, level: number, name: string, flags?: Record<string, any>): Task {
    const task = new Task(id, level, name);
    if (flags) Object.assign(task, flags);
    return task;
}

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

            const task = taskFromToken(generateId("placeholder"), indent, this.currentToken.value, this.currentToken.flags);
            this.next();

            allTasks.push(task);
		}

		return allTasks;
	}
}
