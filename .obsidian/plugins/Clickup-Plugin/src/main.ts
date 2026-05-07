import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
// Remember to rename these classes and interfaces!

import { ApiService } from "taskParser";

import { registerCommands } from 'commands/index';
//TODO: get rid of this? clickup api has status.type. closed and open for this purpose!
const DEFAULT_STATUS_MAPPING = {
	completedStatus: "completed",
	activeStatus: "not started",
	availableStatuses: ["completed", "not started"]
};


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	api: ApiService;
	static useColor: boolean = true;
	async onload() {
		await this.loadSettings();
		//TODO: for now resets to defualt mapping on load
		this.api = new ApiService("clickup", this.settings.apiKey, DEFAULT_STATUS_MAPPING);

		registerCommands(this);


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
