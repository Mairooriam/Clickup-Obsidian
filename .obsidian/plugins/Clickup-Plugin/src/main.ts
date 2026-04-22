import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";

// Remember to rename these classes and interfaces!
import { Logger } from 'taskParser/utils/logger';
import { SuggestModal } from "obsidian";
import { inspect } from "util";
import { ApiService, GetTasksOptions, CreateTaskOptions } from "./taskParser/ApiService";
import { cmdAskAndSetClickupSettings } from 'commands';
import { askYesNo, YesNoModal } from 'components/YesNoModal';

import { TaskParser } from 'taskParser';
import { cacheGenerateDiff, TaskCache } from 'taskParser/core';
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	api: ApiService;
	static useColor: boolean = true;
	async onload() {
		await this.loadSettings();
		this.api = ApiService.getInstance(this.settings.apiKey);
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

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'get-remote',
			name: 'get remote',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// const apiKey = await readFile("../../../../testApiKey", 'utf8');
				// let api = ApiService.getInstance(apiKey);
				const apiKey = this.settings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = ApiService.getInstance(apiKey);

				//TODO: nicer way to do this?
				if (!this.settings.list.selected) {
					const yes = await askYesNo(this.app, "No settings selected. Do you want to select them?");
					new Notice(yes ? "You chose Yes" : "You chose No");

					if (!yes) {
						return;
					} else {
						await cmdAskAndSetClickupSettings(this, editor, view);
					};
				}

				// Gets tasks from clickup
				const md = await TaskParser.getRemote(this.settings.list.selected, this.api);
				editor.replaceSelection(md);
			}
		});
		this.addCommand({
			id: 'check-diff',
			name: 'DiffChecker',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const apiKey = this.settings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = ApiService.getInstance(apiKey);

				// Validate settings
				if (!this.settings.list.selected) {
					const yes = await askYesNo(this.app, "No settings selected. Do you want to select them?");
					new Notice(yes ? "You chose Yes" : "You chose No");

					if (!yes) {
						return;
					} else {
						await cmdAskAndSetClickupSettings(this, editor, view);
					};
				}

				const localMd = editor.getSelection();
				const remoteId = this.settings.list.selected;
				const coloredCache = await TaskParser.getColoredDiffMarkdown(localMd, remoteId, this.api);
				editor.replaceSelection(coloredCache);
			}
		});
		this.addCommand({
			id: 'test-parse-md',
			name: 'Clickup Remove color',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const apiKey = this.settings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = ApiService.getInstance(apiKey);
				let md = editor.getSelection();
				const newMd = TaskParser.setAllTasksColor(md, TaskParser.Colors.default);
				editor.replaceSelection(newMd);
			}
		});
		this.addCommand({
			id: 'set-settings',
			name: 'Set settings',
			editorCallback: async (editor: Editor, view: MarkdownView) => {

				const apiKey = this.settings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = ApiService.getInstance(apiKey);

				cmdAskAndSetClickupSettings(this, editor, view);
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'push-new',
			name: 'push new',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const apiKey = this.settings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = ApiService.getInstance(apiKey);

				console.time("push-new:parse-local");
				let selection = editor.getSelection();
				const local_cache = TaskCache.fromMarkdown(selection);
				console.timeEnd("push-new:parse-local");

				console.time("push-new:get-remote");
				let options: GetTasksOptions = {};
				options.subtasks = true;
				const remote_tasks = await this.api.getTasks(this.settings.list.selected, options);
				let remote = TaskCache.fromApi(remote_tasks);
				console.timeEnd("push-new:get-remote");

				console.time("push-new:diff");
				let diff = cacheGenerateDiff(local_cache, remote);
				console.log("diff before", diff);
				console.timeEnd("push-new:diff");

				console.time("push-new:create-remote");
				const idMap = new Map<string, string>();

				// Create all of the tasks from toPost
				// NOTE: they wont have parent and it wont wait for response
				// to get it done faster
				await Promise.all(diff.toPost.map(async t => {
					const label = `push-new:create-task:${t.name || ''}:${t.id}`;
					console.time(label);
					const op: CreateTaskOptions = {
						name: t.name,
						parent: null,
					};
					const response = await this.api.createTask(this.settings.list.selected, op);
					console.timeEnd(label);
					idMap.set(String(t.id), String(response.id));
				}));
				console.timeEnd("push-new:create-remote");

				// Update the tasks parents to match the previous step 
				console.time("push-new:update-remote");
				console.log("diff after post", diff);
				const updatePromises = diff.toPost
					.filter(t => t.parent)
					.map(async t => {
						const realId = idMap.get(String(t.id));
						console.log("realId: ", realId);
						const realParentId = idMap.get(String(t.parent));
						console.log("realParentId: ", realParentId);

						if (realId && realParentId) {
							await this.api.updateTaskParent(realId, realParentId);
						}
					});
				await Promise.all(updatePromises);
				console.timeEnd("push-new:update-remote");

				console.time("push-new:update-local-ids");
				for (const [localId, remoteId] of idMap.entries()) {
					local_cache.updateNodeId(localId, remoteId);
				}
				console.timeEnd("push-new:update-local-ids");

				console.time("push-new:replace-selection");
				editor.replaceSelection(local_cache.toString());
				console.timeEnd("push-new:replace-selection");
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
