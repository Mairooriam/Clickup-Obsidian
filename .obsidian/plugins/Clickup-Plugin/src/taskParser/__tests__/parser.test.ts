import { Lexer, TokenType } from '../lexer';
import { Parser } from "../parser"
import { Logger } from "../utils/logger";

Logger.setLevel("parser", "warn");
describe('Parser', () => {

	it('parses a simple task', () => {
		const lexer = new Lexer('- Task 1 [id:abc123]');
		const tokens = lexer.tokenize();
		const parser = new Parser(tokens);
		const tasks = parser.parseTasks();

		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('Task 1');
		expect(tasks[0]!.id).toBe('abc123');
	});
	it('parses a simple task to be deleted', () => {
		const lexer = new Lexer('- ~~Task 1 [id:abc123]~~');
		const tokens = lexer.tokenize();
		const parser = new Parser(tokens);
		const tasks = parser.parseTasks();

		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('Task 1');
		expect(tasks[0]!.id).toBe('abc123');
		expect(tasks[0]!.striketrough).toBeDefined();
		expect(tasks[0]!.striketrough).toBe(true);

	});

	it('parses a simple task to be deleted malformed', () => {
		const lexer = new Lexer('- ~~Task 1 [id:abc123]');
		const tokens = lexer.tokenize();
		const parser = new Parser(tokens);
		const tasks = parser.parseTasks();

		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('Task 1');
		expect(tasks[0]!.id).toBe('abc123');
		expect(tasks[0]!.striketrough).toBeDefined();
		expect(tasks[0]!.striketrough).toBe(false);

	});

	it('parses a simple task with checkbox', () => {
		let lexer = new Lexer('- [ ] Task 1 [id:abc123]');
		let tokens = lexer.tokenize();
		let parser = new Parser(tokens);
		let tasks = parser.parseTasks();

		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('Task 1');
		expect(tasks[0]!.completed).toBe(false)
		expect(tasks[0]!.id).toBe('abc123');

		lexer = new Lexer(' - [ ] Task 2 [id:abc123]');
		tokens = lexer.tokenize();
		parser = new Parser(tokens);
		tasks = parser.parseTasks();

		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('Task 2');
		expect(tasks[0]!.completed).toBe(false)
		expect(tasks[0]!.id).toBe('abc123');


		lexer = new Lexer('- [x] Task 3 [id:abc123]');
		tokens = lexer.tokenize();
		parser = new Parser(tokens);
		tasks = parser.parseTasks();

		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('Task 3');
		expect(tasks[0]!.completed).toBe(true);
		expect(tasks[0]!.id).toBe('abc123');

		lexer = new Lexer('   \t- [x] Task 3 [id:abc123]');
		tokens = lexer.tokenize();
		parser = new Parser(tokens);
		tasks = parser.parseTasks();

		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('Task 3');
		expect(tasks[0]!.completed).toBe(true);
		expect(tasks[0]!.id).toBe('abc123');

	});

	it('parses html line', () => {
		// Logger.setLevel("parser", "log");

		const tokens = [
			{ type: TokenType.HTML_OPEN, value: 'span', row: 0, col: 47, flags: { style: "color:#0000ff;" } },
			{ type: TokenType.DASH, value: '-', row: 0, col: 51 },
			{ type: TokenType.CHECKBOX_COMPLETED, value: 'true', row: 0, col: 51 },
			{ type: TokenType.TEXT, value: 'test 1', row: 0, col: 79 },
			{ type: TokenType.HTML_CLOSE, value: 'span', row: 0, col: 86 },
			{ type: TokenType.NEWLINE, value: '\n', row: 1, col: 0 }
		];
		const parser = new Parser(tokens);
		const tasks = parser.parseTasks();
		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('test 1');
		expect(tasks[0]!.completed).toBe(true);

		// Logger.setLevel("parser", "warn");
	});
});
