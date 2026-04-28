import { Lexer } from '../lexer.js';

describe('Lexer', () => {
	it('tokenizes a simple task', () => {
		const lexer = new Lexer('- Task 1 [id:abc123]');
		const tokens = lexer.tokenize();

		expect(tokens.length).toBeGreaterThan(1);

		const token = tokens[1];
		expect(token).toBeDefined();
		expect(token!.type).toBeDefined();
		expect(token!.value).toContain('Task 1');
		expect(token!.flags).toBeDefined();
		expect(token!.flags?.id).toBe('abc123');
	});

	it('handles nested tasks', () => {
		const input = `- Parent Task
\t- Child Task [status:pending]`;
		const lexer = new Lexer(input);
		const tokens = lexer.tokenize();

		expect(tokens[0]).toMatchObject({ type: 'Dash', value: '-' });
		expect(tokens[1]).toMatchObject({ type: 'Text', value: 'Parent Task', flags: {} });
		expect(tokens[2]).toMatchObject({ type: 'Newline', value: '\n' });
		expect(tokens[3]).toMatchObject({ type: 'Indent', value: '1' });
		expect(tokens[4]).toMatchObject({ type: 'Dash', value: '-' });
		expect(tokens[5]).toMatchObject({
			type: 'Text',
			value: 'Child Task',
			flags: { status: 'pending' }
		});
	});


	it('handles tasks with checkboxes', () => {
		const input = `
      - [ ] Uncompleted Task
      - [x] Completed Task
    `;
		const lexer = new Lexer(input);
		const tokens = lexer.tokenize();
		expect(tokens.some(t => t.value.includes('Uncompleted Task'))).toBe(true);
		expect(tokens.some(t => t.value.includes('Completed Task'))).toBe(true);
	});

	it('parses headings and flags at correct positions and levels', () => {
		const input = `
## [teams] TEAM [id:teamId]
### [spaces] SPACE [id:spaceId]
#### [folders] FOLDER [id:FolderId]
- [ ] Uncompleted Task
- [x] Completed Task
    `;
		const lexer = new Lexer(input);
		const tokens = lexer.tokenize();

		// Heading 2
		expect(tokens[1]).toMatchObject({
			type: 'Heading',
			value: '2',
			flags: {}
		});
		expect(tokens[2]).toMatchObject({
			type: 'FLAG',
			value: 'teams'
		});
		expect(tokens[3]).toMatchObject({
			type: 'Text',
			value: 'TEAM',
			flags: { id: 'teamId' }
		});

		// Heading 3
		expect(tokens[5]).toMatchObject({
			type: 'Heading',
			value: '3',
			flags: {}
		});
		expect(tokens[6]).toMatchObject({
			type: 'FLAG',
			value: 'spaces'
		});
		expect(tokens[7]).toMatchObject({
			type: 'Text',
			value: 'SPACE',
			flags: { id: 'spaceId' }
		});

		// Heading 4
		expect(tokens[9]).toMatchObject({
			type: 'Heading',
			value: '4',
			flags: {}
		});
		expect(tokens[10]).toMatchObject({
			type: 'FLAG',
			value: 'folders'
		});
		expect(tokens[11]).toMatchObject({
			type: 'Text',
			value: 'FOLDER',
			flags: { id: 'FolderId' }
		});
	});
	it('tokenizes a simple task to be deleted', () => {
		const lexer = new Lexer('- ~~Task 1 [id:abc123]~~');
		const tokens = lexer.tokenize();

		expect(tokens.length).toBe(4);

		expect(tokens[0]).toMatchObject({ type: 'Dash', value: '-' });
		expect(tokens[1]).toMatchObject({ type: 'Striketrough', value: '~~' });
		expect(tokens[2]).toMatchObject({
			type: 'Text',
			value: 'Task 1',
			flags: { id: 'abc123' }
		});
		expect(tokens[3]).toMatchObject({ type: 'Striketrough', value: '~~' });
	});
});
