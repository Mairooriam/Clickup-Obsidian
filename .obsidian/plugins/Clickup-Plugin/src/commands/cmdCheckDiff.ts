import MyPlugin from "main";
import { Editor, MarkdownView, Notice } from "obsidian";
import { cmdAskAndSetClickupSettings } from "./cmdAskAndSetSettings";
import { askYesNo } from "ui/YesNoModal";
import { TaskParser } from "taskParser";

export async function cmdCheckDiff(plugin: MyPlugin, editor: Editor, view: MarkdownView) {
	// Validate settings
	if (!plugin.settings.list.selected) {
		const yes = await askYesNo(plugin.app, "No settings selected. Do you want to select them?");
		new Notice(yes ? "You chose Yes" : "You chose No");

		if (!yes) {
			return;
		} else {
			await cmdAskAndSetClickupSettings(plugin, editor, view);
		};
	}

	const localMd = editor.getSelection();
	const remoteId = plugin.settings.list.selected;
	const coloredCache = await TaskParser.getColoredDiffMarkdown(localMd, remoteId, plugin.api);
	if (!coloredCache) {
		return;
	}
	editor.replaceSelection(coloredCache);
}

