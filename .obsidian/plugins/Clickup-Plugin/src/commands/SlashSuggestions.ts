import MyPlugin from "main";
import { App, Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, MarkdownView, TFile } from "obsidian";
import { openFlatpickrTest } from "../ui/FlatpickrTest";
import { Task, TaskParser, taskToString } from "taskParser";
import { Logger } from "taskParser/utils/logger";

type SlashItem = { label: string; run: (editor: Editor, start: EditorPosition) => void };

function slashCmd(label: string, run: (editor: Editor, pos: EditorPosition) => void): SlashItem {
	return { label, run };
}

class SimpleSlashSuggest extends EditorSuggest<SlashItem> {
	private items: SlashItem[];
	constructor(app: App, items: SlashItem[]) {
		super(app);
		this.items = items;
	}
	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const before = line.slice(0, cursor.ch);
		const slash = before.lastIndexOf("/");
		if (slash === -1) return null;
		return { start: { line: cursor.line, ch: slash }, end: cursor, query: before.slice(slash + 1) };
	}
	getSuggestions(ctx: EditorSuggestContext): SlashItem[] {
		return this.items.filter(i => i.label.toLowerCase().includes(ctx.query.toLowerCase()));
	}
	renderSuggestion(item: SlashItem, el: HTMLElement) { el.setText(item.label); }
	selectSuggestion(item: SlashItem) {
		if (!this.context) return;
		const { editor, start, end } = this.context;
		editor.replaceRange("", start, end); // remove /query
		item.run(editor, start);
		this.close();
	}
}

function makeSlashItems(app: App): SlashItem[] {
	return [
		slashCmd("Log current line", (editor, pos) => {
			const line = editor.getLine(pos.line);
			console.log("[SlashCmd] current line:", line);
		}),
		slashCmd("Log word count", (editor, pos) => {
			const line = editor.getLine(pos.line);
			const words = line.trim().split(/\s+/).filter(Boolean).length;
			console.log("[SlashCmd] word count on line:", words);
		}),
		slashCmd("Check line", (editor, pos) => {
			const line = editor.getLine(pos.line);
			const task = TaskParser.isTask(line);
			if (!task) {
				console.log("not valid task");
			} else {
				console.log(task);
			}
		}),
		slashCmd("Set due date", (editor, pos) => {
			const line = editor.getLine(pos.line);
			const task = TaskParser.parseTask(line);
			if (!task) {
				console.log("Current line is not valid task. cannot set date");
				return;
			}

			const view = app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) return;
			openFlatpickrTest(app, view, "single", (dates) => {
				if (!dates[0]) {
					console.log("Getting date wasn't succesfull.");
					return;
				}
				   const date = dates[0].getTime();
				   task.dueDate = date;
				   const lineNum = pos.line;
				   const lineText = editor.getLine(lineNum);
				   editor.replaceRange(taskToString(task), { line: lineNum, ch: 0 }, { line: lineNum, ch: lineText.length });
				   console.log("[SlashCmd] due date set:", date);
			});
		}),
	];
}



export function registerSlashCommand(plugin: MyPlugin) {
	plugin.registerEditorSuggest(new SimpleSlashSuggest(plugin.app, makeSlashItems(plugin.app)));
}

