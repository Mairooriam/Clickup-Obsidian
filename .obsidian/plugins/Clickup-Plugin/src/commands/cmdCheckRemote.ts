import { askYesNo } from "ui/YesNoModal";
import MyPlugin from "main";
import { Editor, MarkdownView, Notice } from "obsidian";
import { cmdAskAndSetClickupSettings } from "./cmdAskAndSetSettings";
import { Errors, TaskParser } from "taskParser";
import { noticeErrors } from "components/ErrorNoticer";

export async function cmdGetRemote(plugin: MyPlugin, editor: Editor, view: MarkdownView) {
	//TODO: nicer way to do this?
	if (!plugin.settings.list.selected) {
		const yes = await askYesNo(plugin.app, "No settings selected. Do you want to select them?");
		new Notice(yes ? "You chose Yes" : "You chose No");

		if (!yes) {
			return;
		} else {
			await cmdAskAndSetClickupSettings(plugin, editor, view);
		};
	}

	// Gets tasks from clickup
	const [err, md] = await Errors.catchError(TaskParser.getRemote(plugin.settings.list.selected, plugin.api));
	if (err) {
		noticeErrors(err);
	} else {
		editor.replaceSelection(md);
	}
}
