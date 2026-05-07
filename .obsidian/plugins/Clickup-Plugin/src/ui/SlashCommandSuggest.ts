import { App, Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from "obsidian";

export interface SlashCommand {
	name: string;
	description: string;
	action: (editor: Editor, triggerStart: EditorPosition) => void;
}

export class SlashCommandSuggest extends EditorSuggest<SlashCommand> {
	private commands: SlashCommand[];

	constructor(app: App, commands: SlashCommand[]) {
		super(app);
		this.commands = commands;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.slice(0, cursor.ch);
		const slashIndex = beforeCursor.lastIndexOf("/");
		if (slashIndex === -1) return null;

		// Only trigger if the slash is at the start of the line or after whitespace
		const charBeforeSlash = beforeCursor[slashIndex - 1];
		if (slashIndex > 0 && charBeforeSlash && !/\s/.test(charBeforeSlash)) return null;

		return {
			start: { line: cursor.line, ch: slashIndex },
			end: cursor,
			query: beforeCursor.slice(slashIndex + 1),
		};
	}

	getSuggestions(context: EditorSuggestContext): SlashCommand[] {
		const query = context.query.toLowerCase();
		return this.commands.filter(
			(cmd) =>
				cmd.name.toLowerCase().includes(query) ||
				cmd.description.toLowerCase().includes(query)
		);
	}

	renderSuggestion(cmd: SlashCommand, el: HTMLElement): void {
		el.createEl("div", { text: cmd.name, cls: "slash-cmd-name" });
		el.createEl("small", { text: cmd.description, cls: "slash-cmd-desc" });
	}

	selectSuggestion(cmd: SlashCommand, _evt: MouseEvent | KeyboardEvent): void {
		const context = this.context;
		if (!context) return;

		// Remove the /query text before running the action
		const { editor, start, end } = context;
		editor.replaceRange("", start, end);

		cmd.action(editor, start);
		this.close();
	}
}
