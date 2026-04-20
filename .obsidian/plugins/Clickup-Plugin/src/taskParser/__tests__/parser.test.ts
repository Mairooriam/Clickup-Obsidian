import { Lexer } from '../lexer';
import { Parser } from "../parser"

describe('Parser', () => {
	it('parses a simple task', () => {
		const lexer = new Lexer('- Task 1 [id:abc123]');
		const tokens = lexer.tokenize();
		const parser = new Parser(tokens);
		const tasks = parser.parse();

		expect(tasks.length).toBe(1);
		expect(tasks[0]!.name).toBe('Task 1');
		expect(tasks[0]!.id).toBe('abc123');
	});
});
