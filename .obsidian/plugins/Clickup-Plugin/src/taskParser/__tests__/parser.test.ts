import { Lexer } from '../lexer';
import { Parser } from "../parser"
import { Logger } from "../utils/logger";
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

	//TODO: rmove these probably
	it('fails when there is no list for tasks', () => {
		const input = `
## [teams] TEAM [id:teamId]
### [spaces] SPACE [id:spaceId]
#### [folders] FOLDER [id:FolderId]
- Task without list
`;
		const lexer = new Lexer(input);
		const tokens = lexer.tokenize();
		const parser = new Parser(tokens);

		// Spy directly on Logger.error
		const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => { });

		parser.parseFull();

		expect(errorSpy).toHaveBeenCalledWith(
			"parser",
			expect.stringContaining("Task found, but no list context. Tasks must be inside a list."),
		);

		errorSpy.mockRestore();
	});

	it('fails when there is no folder for tasks', () => {
		const input = `
## [teams] TEAM [id:teamId]
### [spaces] SPACE [id:spaceId]
- Task without folder
`;
		const lexer = new Lexer(input);
		const tokens = lexer.tokenize();
		const parser = new Parser(tokens);

		const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => { });

		parser.parseFull();

		expect(errorSpy).toHaveBeenCalledWith(
			"parser",
			expect.stringContaining("Task found, but no folder context. Tasks must be inside a folder > list."),
		);

		errorSpy.mockRestore();
	});

	it('fails when there is no team or space for tasks', () => {
		const input = `
- Task without team or space
`;
		const lexer = new Lexer(input);
		const tokens = lexer.tokenize();
		const parser = new Parser(tokens);

		const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => { });

		parser.parseFull();

		expect(errorSpy).toHaveBeenCalledWith(
			"parser",
			expect.stringContaining("Task found, bt no team or space context. Tasks must be inside a team > space > folder > list."),
		);

		errorSpy.mockRestore();
	});

});
