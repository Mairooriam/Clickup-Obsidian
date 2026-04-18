import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";

// Remember to rename these classes and interfaces!
import { SuggestModal } from "obsidian";
import { Parser } from "./taskParser/parser"
import { readFile } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { tasksResolveParents, taskMatch, cacheGenerateDiff, TaskCache } from "./taskParser/core"
import { inspect } from "util";
import { ApiService, GetTasksOptions, CreateTaskOptions } from "./taskParser/ApiService";
import { Task } from "./taskParser/apiTypes/index"
import { Lexer } from "taskParser/lexer"
import { Colors } from 'taskParser/utils/colors';

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
			id: 'open-modal-simple',
			name: 'Open modal (simpl)',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				new SampleModal(this.app).open();
				// const apiKey = await readFile("../../../../testApiKey", 'utf8');
				// let api = ApiService.getInstance(apiKey);
				const apiKey = this.settings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = ApiService.getInstance(apiKey);
				// If teams not set in settings browse here and select.
				const teams = await this.api.getTeams();
				const teamId = teams[0]!.id;
				const spaces = await this.api.getSpaces(teamId);
				const spaceId = spaces[0]!.id;
				const folders = await this.api.getFolders(spaceId)
				const folder = folders.find((f: any) => f.name === "Projects");
				if (!folder) throw new Error("Folder not found");
				console.log("Found folder:", folder);
				console.log("Lists in folder:", folder.lists);
				const list = folder.lists.find((f: any) => f.name === "API_test_lista");
				if (!list) throw new Error("list not found");
				console.log("Found list: name:%s id:%s", list.name, list.id);
				let options: GetTasksOptions = {};
				options.subtasks = true;
				const tasks = await this.api.getTasks(list.id, options);
				let local = TaskCache.fromTasks(tasks);
				const cacheString = local.toString();
				console.log(cacheString);
				console.log(local);
				editor.replaceSelection(cacheString);
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
				//Local
				let selection = editor.getSelection();
				const lexer = new Lexer(selection);
				let local_cache = TaskCache.fromMd(selection);
				// Fetch
				const teams = await this.api.getTeams();
				const teamId = teams[0]!.id;
				const spaces = await this.api.getSpaces(teamId);
				const spaceId = spaces[0]!.id;
				const folders = await this.api.getFolders(spaceId)
				const folder = folders.find((f: any) => f.name === "Projects");
				if (!folder) throw new Error("Folder not found");
				const list = folder.lists.find((f: any) => f.name === "API_test_lista");
				if (!list) throw new Error("list not found");
				let options: GetTasksOptions = {};
				options.subtasks = true;

				//remote
				//TODO: way of getting this.
				const remote_tasks = await this.api.getTasks(list.id, options);
				let remote = TaskCache.fromTasks(remote_tasks);
				//Diff
				let diff = cacheGenerateDiff(local_cache, remote);
				console.log("Diff", diff);

				local_cache.setColorForAll(Colors.White);
				diff.toPost.forEach(task => local_cache.setColorForSubtree(task.id, Colors.Green));
				diff.toPut.forEach(task => local_cache.setColorForSubtree(task.id, Colors.Blue));
				diff.toDelete.forEach(task => local_cache.setColorForSubtree(task.id, Colors.Red));

				editor.replaceSelection(local_cache.toString());
				console.log(local_cache.toString());
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
				let selection = editor.getSelection();
				const lexer = new Lexer(selection);
				const tokens = lexer.tokenize()
				const parser = new Parser(tokens);
				const tasks = parser.parse();
				const cache = TaskCache.fromTasks(tasks);
				// Use static toggle for color
				cache.setColorForAll(Colors.default);

				// if (MyPlugin.useColor) {
				// 	cache.setColorForAll(Colors.Green);
				// 	MyPlugin.useColor = false;
				// } else {
				// 	cache.setColorForAll(Colors.default);
				// 	MyPlugin.useColor = true;
				// }
				editor.replaceSelection(cache.toString());

			}
		});
		this.addCommand({
			id: 'get-remote-to-cursor',
			name: 'get remote to cursor',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const apiKey = this.settings.apiKey;
				if (!apiKey) {
					new Notice("API key not set. Please enter it in the plugin settings.");
					return;
				}
				this.api = ApiService.getInstance(apiKey);

				const teams = await this.api.getTeams();
				new TeamSuggestModal(this.app, teams, async (team) => {
					const spaces = await this.api.getSpaces(team.id);
					new TeamSuggestModal(this.app, spaces, async (space) => {
						const folders = await this.api.getFolders(space.id);
						new TeamSuggestModal(this.app, folders, async (folder) => {
							const lists = folder.lists || [];
							if (lists.length === 0) {
								new Notice("No lists found in this folder.");
								return;
							}
							// Add a modal for lists here
							new TeamSuggestModal(this.app, lists, async (list) => {
								let options: GetTasksOptions = {};
								options.subtasks = true;
								const tasks = await this.api.getTasks(list.id, options);
								let local = TaskCache.fromTasks(tasks);
								const cacheString = local.toString();
								editor.replaceSelection(cacheString);
							}).open();
						}).open();
					}).open();
				}).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				editor.replaceSelection('Sample editor command');
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
class TeamSuggestModal extends SuggestModal<any> {
    constructor(app: App, private teams: any[], private onChoose: (team: any) => void) {
        super(app);
    }
    getSuggestions(query: string) {
        return this.teams.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
    }
    renderSuggestion(team: any, el: HTMLElement) {
        el.setText(team.name);
    }
    onChooseSuggestion(team: any) {
        this.onChoose(team);
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
