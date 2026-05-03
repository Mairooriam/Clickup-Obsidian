import { App, Editor, MarkdownView, Notice, View } from "obsidian";
import { GenericSuggestModal } from "./components/suggestModal";
import type { Team, Space, Folder, List } from "./taskParser/api/types";
import MyPlugin from "main";
import { askYesNo } from "components/YesNoModal";
import { TaskParser, TaskParserDev } from "taskParser";

async function selectFromModal<T>(
	app: App,
	items: T[],
	getItemText: (item: T) => string
): Promise<T | null> {
	return new Promise((resolve) => {
		new GenericSuggestModal<T>(
			app,
			items,
			getItemText,
			(item: T) => resolve(item)
		).open();
	});
}

//TODO: i dont like this. fethc the whole structure? maybe? loading in between choosing team -> space -> folder. but then again user
//should set them just once. not be touching it all the time.
export async function cmdAskAndSetClickupSettings(plugin: MyPlugin, editor: Editor, view: MarkdownView) {
	//TEAMS
	const teams = await plugin.api.getTeams();
	const team = await selectFromModal<Team>(plugin.app, teams, t => t.name);
	if (!team) {
		new Notice("Team selection failed");
		return;
	}
	plugin.settings.team = plugin.settings.team || {};
	plugin.settings.team.selected = team.id;
	plugin.settings.team.data = { teams };
	await plugin.saveSettings();

	//SPACES 
	const spaces = await plugin.api.getSpaces(team.id);
	const space = await selectFromModal<Space>(plugin.app, spaces, s => s.name);
	if (!space) {
		new Notice("Space selection failed");
		return;
	}
	plugin.settings.space = plugin.settings.space || {};
	plugin.settings.space.selected = space.id;
	plugin.settings.space.data = { spaces };
	await plugin.saveSettings();

	// FOLDERS
	const folders = await plugin.api.getFolders(space.id);
	const folder = await selectFromModal<Folder>(plugin.app, folders, f => f.name);
	if (!folder) {
		new Notice("Folder selection failed");
		return;
	}
	plugin.settings.folder = plugin.settings.folder || {};
	plugin.settings.folder.selected = folder.id;
	plugin.settings.folder.data = { folders };
	await plugin.saveSettings();

	// LISTS
	const lists = folder.lists || [];
	if (lists.length === 0) {
		new Notice("No lists found in this folder.");
		return;
	}
	const list = await selectFromModal<List>(plugin.app, lists, l => l.name);
	if (!list) {
		new Notice("List selection failed");
		return;
	}
	plugin.settings.list = plugin.settings.list || {};
	plugin.settings.list.selected = list.id;
	plugin.settings.list.data = { lists };
	await plugin.saveSettings();
}

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
	const md = await TaskParser.getRemote(plugin.settings.list.selected, plugin.api);
	editor.replaceSelection(md);
}

export function cmdTokenize(plugin: MyPlugin, editor: Editor, view: MarkdownView) {
	const selection = editor.getSelection();
	TaskParserDev.tokenizeAndLog(selection);
}

export async function cmdRemoveSelectionColor(plugin: MyPlugin, editor: Editor, view: MarkdownView) {
	let md = editor.getSelection();
	const newMd = TaskParser.setAllTasksColor(md, TaskParser.Colors.default);
	editor.replaceSelection(newMd);
}

