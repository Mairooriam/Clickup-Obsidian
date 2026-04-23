import type { Token } from "./lexer.js"
import { TokenType } from "./lexer.js"
import { Task } from "./apiTypes/index.js"
import { generateId } from "./id.js";

import { Color, Colors, toColor } from "./utils/colors.js";
import { Logger } from "./utils/logger.js";

function taskFromToken(id: string, level: number, name: string, color: Color, flags?: Record<string, any>): Task {
	const task = new Task(id, level, name, color);
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
	parseFull(): Project {

	}


	parseTasks(): Task[] {
		const allTasks: Task[] = [];
		let color: Color = Colors.default;
		let htmlOpen = false;
		while (!this.isToken(TokenType.EOF)) {

			if (
				this.isToken(TokenType.HTML_OPEN) &&
				this.currentToken.flags &&
				typeof this.currentToken.flags.style === "string"
			) {
				const style = this.currentToken.flags.style;
				const match = style.match(/color\s*:\s*([^;]+)/i);
				if (match) {
					color = toColor(match[1]!.trim()) ?? Colors.default;
					htmlOpen = true;
				}
				this.next();
				continue;
			}

			if (this.isToken(TokenType.HTML_CLOSE)) {
				color = Colors.default;
				htmlOpen = false;
				this.next();
				continue;
			}

			if (this.isToken(TokenType.NEWLINE)) {
				if (htmlOpen) {
					Logger.warn("parser", "Malformed input: span not closed before newline", this);
					color = Colors.default;
					htmlOpen = false;
				}
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

			const task = taskFromToken(generateId("placeholder"), indent, this.currentToken.value, color, this.currentToken.flags);
			this.next();

			allTasks.push(task);
		}

		return allTasks;
	}
}
