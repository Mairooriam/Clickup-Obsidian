import type { Token } from "./lexer.js"
import { TokenType } from "./lexer.js"
import { createTask, Task, TaskFlagsSchema } from "./api/types.js"
import { generateId } from "./utils/id.js";

import { Color, Colors, toColor } from "./utils/colors.js";
import { Logger } from "./utils/logger.js";

//TODO: rethink this. terrible.
function taskFromToken(id: string, level: number, name: string, color: Color, striketrough: boolean, completed: boolean, flags?: Record<string, string>): Task {
	const task = createTask(id, level, name, striketrough, completed, color);
	if (flags) {
		const parsed = TaskFlagsSchema.safeParse(flags);
		if (parsed.success) {
			Object.assign(task, parsed.data);
		} else {
			Logger.warn("parser", "Failed to parse task flags", flags, parsed.error.issues);
		}
	}
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

	private current(): Token {
		return this.currentToken;
	}

	private skipToNextLine(): void {
		while (!this.isToken(TokenType.NEWLINE, TokenType.EOF)) {
			this.next();
		}
		if (this.isToken(TokenType.NEWLINE)) this.next();
	}
	private parseTaskList(): Task[] {
		const allTasks: Task[] = [];
		let color: Color = Colors.default;
		let htmlOpen = false;
		while (!this.isToken(TokenType.EOF)) {
			if (this.isToken(TokenType.HTML_OPEN)) {
				if (this.currentToken.flags && typeof this.currentToken.flags.style === "string") {
					Logger.log("parser", `HTML_OPEN with style: ${this.currentToken.flags.style}`);
					const style = this.currentToken.flags.style;
					const match = style.match(/color\s*:\s*([^;]+)/i);
					if (match) {
						color = toColor(match[1]!.trim()) ?? Colors.default;
						htmlOpen = true;
						Logger.log("parser", `Set color: ${color}, htmlOpen: true`);
					} else {
						Logger.warn("parser", "HTML_OPEN token with style flag but no color found", this.currentToken);
					}
				} else {
					Logger.warn("parser", "HTML_OPEN token without flags or style", this.currentToken);
				}
				this.next();
				continue;
			}

			if (this.isToken(TokenType.HTML_CLOSE)) {
				Logger.log("parser", "HTML_CLOSE, resetting color and htmlOpen");
				color = Colors.default;
				htmlOpen = false;
				this.next();
				continue;
			}

			if (this.isToken(TokenType.NEWLINE)) {
				Logger.log("parser", "NEWLINE token");
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
				Logger.log("parser", `INDENT token, value: ${this.currentToken.value}`);
				indent = Number(this.currentToken.value);
				this.next();
			}

			if (!this.isToken(TokenType.DASH)) {
				Logger.log("parser", `Not a DASH token, skipping to next line`);
				this.skipToNextLine();
				continue;
			}

			Logger.log("parser", `DASH token`);
			this.next();

			let completed = false;
			if (this.isToken(TokenType.CHECKBOX_COMPLETED)) {
				Logger.log("parser", `CHECKBOX_COMPLETED token`);
				this.next();
				completed = true;
			} else if (this.isToken(TokenType.CHECKBOX_EMPTY)) {
				Logger.log("parser", `CHECKBOX_EMPTY token`);
				this.next();
			}

			let striketrough = 0;
			if (this.isToken(TokenType.STRIKETROUGH)) {
				Logger.log("parser", `STRIKETROUGH token (before text)`);
				this.next();
				striketrough++;
			}

			let taskToken: Token;
			if (!this.isToken(TokenType.TEXT)) {
				Logger.log("parser", `Not a TEXT token, skipping to next line`);
				this.skipToNextLine();
				continue;
			} else {
				Logger.log("parser", `TEXT token, value: ${this.currentToken.value}`);
				taskToken = this.current();
				this.next();
			}

			if (this.isToken(TokenType.STRIKETROUGH)) {
				Logger.log("parser", `STRIKETROUGH token (after text)`);
				this.next();
				striketrough++;
			}

			Logger.log("parser", `Creating task: name=${taskToken.value}, color=${color}, completed=${completed}, striketrough=${striketrough > 1}, indent=${indent}`);
			const task = taskFromToken(
				generateId("placeholder"),
				indent,
				taskToken.value,
				color,
				striketrough > 1,
				completed,
				taskToken.flags
			);

			Logger.log("parser", `Task pushed: ${taskToken.value}`);
			allTasks.push(task);
		}
		return allTasks;
	}

	parseTasks(): Task[] {
		return this.parseTaskList();
	}

}
