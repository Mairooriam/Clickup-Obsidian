import MyPlugin from "main";
import { Editor, MarkdownView } from "obsidian";
import { TaskParser } from "taskParser";

export async function cmdRemoveSelectionColor(plugin: MyPlugin, editor: Editor, view: MarkdownView) {
	let md = editor.getSelection();
	const newMd = TaskParser.setAllTasksColor(md, TaskParser.Colors.default);
	editor.replaceSelection(newMd);
}
