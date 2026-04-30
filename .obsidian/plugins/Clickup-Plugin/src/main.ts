import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
import { EditorView, ViewUpdate } from "@codemirror/view";
// Remember to rename these classes and interfaces!

import { cmdAskAndSetClickupSettings, cmdCheckDiff, cmdGetRemote, cmdRemoveSelectionColor } from 'commands';
import { ApiService, TaskParser } from "taskParser";
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	api: ApiService;
	static useColor: boolean = true;
	async onload() {
		await this.loadSettings();
		this.api = new ApiService("clickup", this.settings.apiKey);
		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Sample', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');
		if (this.settings.apiKey && this.settings.team.refreshOnOpen) {
			try {
				const teams = await this.api.getTeams();
				this.settings.team.data = teams;
				await this.saveSettings();
			} catch (e) {
				console.error("Failed to fetch teams on load:", e);
			}
		}
		const slashFlagExtension = EditorView.updateListener.of((vu: ViewUpdate) => {
			if (!vu.docChanged) return;
			const { state, view } = vu;
			const cursor = view.state.selection.main.head;
			const line = state.doc.lineAt(cursor);
			const beforeCursor = state.doc.sliceString(line.from, cursor);
			if (beforeCursor.endsWith("/")) {
				//TODO: check if inside task
				new Notice("hello from flag extension");
			}
		});
		this.registerEditorExtension(slashFlagExtension);
		this.addCommand({
			id: 'get-remote',
			name: 'get remote',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const apiKey = this.settings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.settings.apiKey);

				cmdGetRemote(this, editor, view);

			}
		});
		this.addCommand({
			id: 'check-diff',
			name: 'DiffChecker',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!this.settings.apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.settings.apiKey);
				cmdCheckDiff(this, editor, view);
			}
		});
		this.addCommand({
			id: 'test-parse-md',
			name: 'Clickup Remove color',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!this.settings.apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				tthis.api = new ApiService("clickup", this.settings.apiKey);
				cmdRemoveSelectionColor(this, editor, view);
			}
		});
		this.addCommand({
			id: 'set-settings',
			name: 'Set settings',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!this.settings.apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.settings.apiKey);
				cmdAskAndSetClickupSettings(this, editor, view);
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'push-new',
			name: 'push new',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!this.settings.apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = new ApiService("clickup", this.settings.apiKey);

				let selection = editor.getSelection();
				const newMd = await TaskParser.processDiffToPost(selection, this.settings.list.selected, this.api);
				if (newMd) {
					editor.replaceSelection(newMd);
				}
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			new Notice("Click");
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
