//TODO: i dont like this. fethc the whole structure? maybe? loading in between choosing team -> space -> folder. but then again user

import MyPlugin from "main";
import { Editor, MarkdownView, Notice } from "obsidian";
import { Team, Space, Folder, List } from "taskParser"
import { selectFromModal } from "ui/SelectFromModal";

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
