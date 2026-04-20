import { Lexer } from '../lexer';

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
});
