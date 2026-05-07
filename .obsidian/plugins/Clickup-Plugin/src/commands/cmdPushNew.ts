import MyPlugin from "main";
import { Editor } from "obsidian";
import { TaskParser } from "taskParser";

export async function pushNew(plugin: MyPlugin, editor: Editor) {
	let selection = editor.getSelection();
	const newMd = await TaskParser.processDiffToPost(selection, plugin.settings.list.selected, plugin.api);
	if (newMd) {
		editor.replaceSelection(newMd);
	}
}
