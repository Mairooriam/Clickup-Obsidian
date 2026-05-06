import MyPlugin from "main";
import { Editor, MarkdownView } from "obsidian";
import { TaskParserDev } from "taskParser";

export function cmdTokenize(plugin: MyPlugin, editor: Editor, view: MarkdownView) {
	const selection = editor.getSelection();
	TaskParserDev.tokenizeAndLog(selection);
}
