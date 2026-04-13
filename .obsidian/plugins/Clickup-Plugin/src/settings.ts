import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	mySetting: string;
	 apiKey: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	apiKey: "",
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Plugin Settings' });

		// API Key input
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your ClickUp API key')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}
