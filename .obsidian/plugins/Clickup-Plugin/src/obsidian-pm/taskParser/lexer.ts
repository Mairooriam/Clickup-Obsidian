import { Char } from "./utils/char.js";
import { Logger } from "./utils/logger.js";
export const enum TokenType {
	DASH = "Dash",
	CHECKBOX_EMPTY = "Checkbox Empty",
	CHECKBOX_COMPLETED = "Checkbox Completed",
	SQUARE_BRACE_OPEN = "[",
	FLAG = "FLAG",
	SQUARE_BRACE_CLOSED = "]",
	TEXT = "Text",
	INDENT = "Indent",
	NEWLINE = "Newline",
	HTML_OPEN = "HTML Open",
	HTML_CLOSE = "HTML Close",
	HEADING = "Heading",
	SPACE = "Space",
	STRIKETROUGH = "Striketrough",
	EOF = "End of File"
}

export interface Token {
	type: TokenType;
	value: string;
	row: number;
	col: number;
	flags?: Record<string, string>;
}

export class Lexer {
	private input: string;
	private position: number = 0;
	private row: number = 0;
	private col: number = 0;

	constructor(input: string) {
		this.input = input;
	}

	private isAtEnd(): boolean {
		return this.position >= this.input.length;
	}

	private is(char: Char): boolean {
		if (this.current() === char) {
			return true;
		} else {
			return false;
		}
	}

	private current(): string {
		return this.isAtEnd() ? '\0' : this.input[this.position]!;
	}

	private peek(offset: number = 1): string {
		const peekPosition = this.position + offset;
		return peekPosition >= this.input.length ? '\0' : this.input[peekPosition]!;
	}

	private advance(count: number = 1): void {
		for (let i = 0; i < count; i++) {
			if (this.isAtEnd()) return;

			if (this.current() === '\n') {
				this.row++;
				this.col = 0;
			} else {
				this.col++;

			}
			this.position++;
		}
	}

	private skipWhitespace(): void {
		while (!this.isAtEnd() && this.current() === ' ') {
			this.advance();
		}
	}

	private readText(): string {
		let text = '';
		while (!this.isAtEnd() && this.current() !== '\n' && this.current() !== '<') {
			// Stop at "--" (strikethrough end) if found
			if (this.current() === '~' && this.peek() === '~') {
				break;
			}
			text += this.current();
			this.advance();
		}
		return text.trim();
	}

	parseTextWithFlags(text: string): { text: string; flags: Record<string, string> } {
		const flags: Record<string, string> = {};
		let cleanText = '';
		let i = 0;
		while (i < text.length) {
			if (text[i] === '[') {
				const start = i;
				const colonIdx = text.indexOf(':', i + 1);
				if (colonIdx === -1) {
					// No colon, treat as normal text
					cleanText += text[i];
					i++;
					continue;
				}
				const closeIdx = text.indexOf(']', colonIdx + 1);
				const wrongCloseIdx = text.indexOf('}', colonIdx + 1);
				if (closeIdx === -1 || (wrongCloseIdx !== -1 && wrongCloseIdx < closeIdx)) {
					// Found } before ], invalid flag
					console.warn(`Invalid flag detected: missing closing ']' in "${text.slice(start, wrongCloseIdx + 1)}"`);
					i = wrongCloseIdx + 1;
					continue;
				}
				const key = text.slice(i + 1, colonIdx).trim();
				const value = text.slice(colonIdx + 1, closeIdx).trim();
				flags[key] = value;
				i = closeIdx + 1;
			} else {
				cleanText += text[i];
				i++;
			}
		}
		return {
			text: cleanText.trim(),
			flags: flags
		};
	}
	private countChar(chars: string[]): number {
		let count = 0;
		while (!this.isAtEnd() && chars.includes(this.current())) {
			count++;
			this.advance();
		}
		return count;
	}
	getNextToken(): Token {
		while (!this.isAtEnd()) {
			const current = this.current();
			switch (current) {
				case '\n':
					this.advance();
					this.skipWhitespace();
					return { type: TokenType.NEWLINE, value: '\n', row: this.row, col: this.col };
				case '\t': {
					const indent = this.countChar(['\t']);
					if (indent > 0) {
						return { type: TokenType.INDENT, value: indent.toString(), row: this.row, col: this.col };
					}
					this.advance();
					continue;
				}
				   case ' ':
					   this.skipWhitespace();
					   continue;
				case '-':
					if (this.peek() === ' ') {
						this.advance();
						this.skipWhitespace();
						return { type: TokenType.DASH, value: '-', row: this.row, col: this.col };
					}
				case '~':
					if (this.peek() === '~') {
						this.advance(2);
						this.skipWhitespace();
						return { type: TokenType.STRIKETROUGH, value: '~~', row: this.row, col: this.col };
					}
				case '[':
					if (this.peek() === ' ' && this.peek(2) === ']') {
						this.advance(3);
						const checkboxEmpty = { type: TokenType.CHECKBOX_EMPTY, value: 'false', row: this.row, col: this.col };
						this.skipWhitespace();
						return checkboxEmpty;
					}
					else if (this.peek() === 'x' && this.peek(2) === ']') {
						const checkboxCompleted = { type: TokenType.CHECKBOX_COMPLETED, value: 'true', row: this.row, col: this.col };
						this.advance(3);
						this.skipWhitespace();
						return checkboxCompleted;
					} else {
						let text = "";
						this.advance();
						while (!this.isAtEnd() && !this.is("]")) {
							text += this.current();
							this.advance();
						}

						if (!this.is("]")) {
							Logger.warn("lexer", "Unclosed '[' brace");
							break;
						}

						this.advance();
						this.skipWhitespace()
						return { type: TokenType.FLAG, value: text, row: this.row, col: this.col };
					}
				case ']': {
					return { type: TokenType.SQUARE_BRACE_CLOSED, value: "]", row: this.row, col: this.col };

				}
				case '<':
					// </tagname> - html close
					if (this.peek() === '/') {
						let tag = '';
						this.advance(2);
						while (!this.isAtEnd() && this.current() !== '>') {
							tag += this.current();
							this.advance();
						}
						this.advance();
						return { type: TokenType.HTML_CLOSE, value: tag.trim(), row: this.row, col: this.col };
					}
					if (this.peek() !== '>') {
						let tag = '';
						this.advance(); // skip <
						while (!this.isAtEnd() && this.current() !== '>') {
							tag += this.current();
							this.advance();
						}
						this.advance(); // skip >
						const tagName = tag.split(' ')[0] ?? '';
						// Support spaces around = and multiple attributes
						const attrPattern = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
						const flags: Record<string, string> = {};
						let match;
						while ((match = attrPattern.exec(tag)) !== null) {
							if (match[1] && match[2] !== undefined) {
								flags[match[1]] = match[2];
							}
						}
						return { type: TokenType.HTML_OPEN, value: tagName, row: this.row, col: this.col, flags };
					}
					this.advance();
					break;
				case '#': {
					let level = 1;
					this.advance();
					while (this.is("#")) {
						level++;
						this.advance();
					}
					this.skipWhitespace()

					return {
						type: TokenType.HEADING,
						value: String(level),
						row: this.row,
						col: this.col,
						flags: {}
					};
				}
				default: {
					const text = this.readText();
					if (text) {
						const { text: cleanText, flags } = this.parseTextWithFlags(text);
						return {
							type: TokenType.TEXT,
							value: cleanText,
							row: this.row,
							col: this.col,
							flags: flags
						};
					}
					this.advance();

				}
			}
		}
		return { type: TokenType.EOF, value: '', row: this.row, col: this.col };
	}

	tokenize(): Token[] {
		const tokens: Token[] = [];

		while (!this.isAtEnd()) {
			const token = this.getNextToken();
			tokens.push(token);

			if (token.type === TokenType.EOF) {
				break;
			}
		}

		return tokens;
	}
}
