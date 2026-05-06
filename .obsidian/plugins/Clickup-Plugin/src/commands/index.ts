import MyPlugin from "main";
import { cmdAskAndSetClickupSettings } from "./cmdAskAndSetSettings";
import { Editor, MarkdownView } from "obsidian";
import { cmdGetRemote } from "./cmdCheckRemote";
import { cmdTokenize } from "./debugCommands";
import { cmdCheckDiff } from "./cmdCheckDiff";
import { cmdRemoveSelectionColor } from "./cmdRemoveSelectionColor";
import { cmdAuthenticate } from "./cmdAuthenticate";
import { pushNew } from "./cmdPushNew";

export function registerCommands(plugin: MyPlugin) {
	plugin.addCommand({
		id: 'get-remote',
		name: 'get remote',
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			cmdGetRemote(plugin, editor, view);
		}
	});

	plugin.addCommand({
		id: 'tokenize',
		name: 'tokenize selection',
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			cmdTokenize(plugin, editor, view);
		}
	});

	plugin.addCommand({
		id: 'check-diff',
		name: 'DiffChecker',
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			cmdCheckDiff(plugin, editor, view);
		}
	});
	plugin.addCommand({
		id: 'test-parse-md',
		name: 'Clickup Remove color',
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			cmdRemoveSelectionColor(plugin, editor, view);
		}
	});
	plugin.addCommand({
		id: 'set-settings',
		name: 'Set settings',
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			cmdAskAndSetClickupSettings(plugin, editor, view);
		}
	});

	plugin.addCommand({
		id: 'auth',
		name: 'auth',
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			cmdAuthenticate(plugin);
		}
	});


	// This adds an editor command that can perform some operation on the current editor instance
	//TODO: make into command
	plugin.addCommand({
		id: 'push-new',
		name: 'push new',
		editorCallback: async (editor: Editor, view: MarkdownView) => {
			pushNew(plugin, editor);
		}
	});
}
