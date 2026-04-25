import type { Token } from "./lexer.js"
import { TokenType } from "./lexer.js"
import { Folder, List, Space, Task, Team } from "./apiTypes/index.js"
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

			if (this.isToken(TokenType.CHECKBOX_COMPLETED, TokenType.CHECKBOX_EMPTY)) {
				this.next();
			}

			if (!this.isToken(TokenType.TEXT)) {
				this.skipToNextLine();
				continue;
			}

			const task = taskFromToken(
				generateId("placeholder"),
				indent,
				this.currentToken.value,
				color,
				this.currentToken.flags
			);
			this.next();

			allTasks.push(task);
		}
		return allTasks;
	}

	parseTasks(): Task[] {
		return this.parseTaskList();
	}

	/**
	 * Parses the full structure: Team > Space > Folder > List > Tasks
	 * Expects tokens in the order:
	 *   Heading (level 2+) + FLAG (team/space/folder) + Text (name + id flag)
	 */
	parseFull(): Team[] {
		const teams: Team[] = [];
		let currentTeam: Team | null = null;
		let currentSpace: Space | null = null;
		let currentFolder: Folder | null = null;
		let currentList: List | null = null;

		while (!this.isToken(TokenType.EOF)) {
			// Parse Team Heading
			if (this.isToken(TokenType.HEADING) && this.current().value === "2") {
				this.next();
				if (this.isToken(TokenType.FLAG) && this.current().value === "teams") {
					this.next();
					if (this.isToken(TokenType.TEXT)) {
						const name = this.currentToken.value;
						const id = this.currentToken.flags?.id ?? generateId("team");
						currentTeam = { id, name, spaces: [] };
						teams.push(currentTeam);
						this.next();
						continue;
					}
				}
			}

			// Parse Space Heading
			if (this.isToken(TokenType.HEADING) && this.current().value === "3") {
				this.next();
				if (this.isToken(TokenType.FLAG) && this.current().value === "spaces") {
					this.next();
					if (this.isToken(TokenType.TEXT)) {
						const name = this.currentToken.value;
						const id = this.currentToken.flags?.id ?? generateId("space");
						currentSpace = { id, name, folders: [] };
						if (currentTeam) currentTeam.spaces.push(currentSpace);
						this.next();
						continue;
					}
				}
			}

			// Parse Folder Heading
			if (this.isToken(TokenType.HEADING) && this.current().value === "4") {
				this.next();
				if (this.isToken(TokenType.FLAG) && this.current().value === "folders") {
					this.next();
					if (this.isToken(TokenType.TEXT)) {
						const name = this.currentToken.value;
						const id = this.currentToken.flags?.id ?? generateId("folder");
						currentFolder = {
							id,
							name,
							orderIndex: 0,
							taskCount: "0",
							lists: []
						};
						if (currentSpace) currentSpace.folders.push(currentFolder);
						this.next();
						continue;
					}
				}
			}

			// Parse List Heading (optional, if you want to support lists)
			if (this.isToken(TokenType.HEADING) && this.current().value === "5") {
				this.next();
				if (this.isToken(TokenType.FLAG) && this.current().value === "lists") {
					this.next();
				if (this.isToken(TokenType.TEXT)) {
					const name = this.currentToken.value;
					const id = this.currentToken.flags?.id ?? generateId("list");
					currentList = {
						id: Number(id),
						name,
						orderIndex: 0,
						tasks: []
					};
					if (currentFolder) currentFolder.lists.push(currentList);
					this.next();
					continue;
				}
			}
		}

		// Parse Tasks under current List or Folder
		if (this.isToken(TokenType.DASH)) {
			const tasks = this.parseTaskList();

			if (!currentTeam || !currentSpace) {
				Logger.error("parser", "Task found, but no team or space context. Tasks must be inside a team > space > folder > list.");
			} else if (!currentFolder) {
				Logger.error("parser", "Task found, but no folder context. Tasks must be inside a folder > list.");
			} else if (!currentList) {
				Logger.error("parser", "Task found, but no list context. Tasks must be inside a list.");
			} else {
				currentList.tasks.push(...tasks);
			}
			continue;
		}

			this.next();
		}

		return teams;
	}
}
