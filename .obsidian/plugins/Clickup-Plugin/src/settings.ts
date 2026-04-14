import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";
import { ClickupResponseSlim_GetTeams, } from "./taskParser/apiTypes/getTeams"
import { ClickupResponseSlim_GetSpaces } from "taskParser/apiTypes";

export interface TeamSettings {
	data: ClickupResponseSlim_GetTeams;
	selected: string;
	refreshOnOpen: boolean;
}
export interface SpaceSettings {
	data: ClickupResponseSlim_GetSpaces;
	selected: string;
}
export interface MyPluginSettings {
	mySetting: string;
	apiKey: string;
	team: TeamSettings;
	space: SpaceSettings;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	apiKey: "",
	team: {
		data: { teams: [] },
		selected: "0",
		refreshOnOpen: true,
	},
	    space: {
        data: { spaces: [] },
        selected: "0",
    },
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	onLoad(): void { }

	async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Plugin Settings' });

		containerEl.createEl('div', { text: 'Settings loaded' });

		this.displayAuth(containerEl);
		this.displayTeamSection(containerEl);
		this.displaySpaceSection(containerEl);
	}


	private displayAuth(containerEl: HTMLElement) {

		// Refresh button
		let refreshBtn = containerEl.createEl("button", { text: "Refresh teams" });
		let statusEl = containerEl.createSpan({ text: "" });
		refreshBtn.onclick = async () => {
			refreshBtn.disabled = true;
			statusEl.setText("Refreshing...");
			const teams = await this.plugin.api.getTeamsSlim();
			this.plugin.settings.team.data = teams;
			await this.plugin.saveSettings();
			statusEl.setText("Teams refreshed!");
			refreshBtn.disabled = false;
			console.log(teams);
			this.display();
		};

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

	private displayTeamSection(containerEl: HTMLElement) {
		const teamOptions: Record<string, string> = { "0": "None" };
		this.plugin.settings.team.data.teams.forEach(t => {
			teamOptions[t.id] = t.name;
		});

		new Setting(containerEl)
			.setName('Load teams on settings open')
			.setDesc('Automatically fetch teams from ClickUp every time you open settings')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.team.refreshOnOpen)
					.onChange(async (value) => {
						this.plugin.settings.team.refreshOnOpen = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Selected Team')
			.setDesc('Choose your team')
			.addDropdown(drop => {
				drop
					.addOptions(teamOptions)
					.setValue(this.plugin.settings.team.selected)
					.onChange(async (value) => {
						this.plugin.settings.team.selected = value;
						await this.plugin.saveSettings();
					});
			});
	}

	    private displaySpaceSection(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: 'Space' });

        // Only show if a team is selected
        if (this.plugin.settings.team.selected === "0") {
            containerEl.createEl('div', { text: 'Select a team first.' });
            return;
        }

        let refreshBtn = containerEl.createEl("button", { text: "Refresh spaces" });
        let statusEl = containerEl.createSpan({ text: "" });
        refreshBtn.onclick = async () => {
            refreshBtn.disabled = true;
            statusEl.setText("Refreshing...");
            const spaces = await this.plugin.api.getSpacesSlim(this.plugin.settings.team.selected);
            this.plugin.settings.space.data = spaces;
            await this.plugin.saveSettings();
            statusEl.setText("Spaces refreshed!");
            refreshBtn.disabled = false;
            this.display();
        };

        const spaceOptions: Record<string, string> = { "0": "None" };
        this.plugin.settings.space.data.spaces.forEach(s => {
            spaceOptions[s.id] = s.name;
        });

        new Setting(containerEl)
            .setName('Selected Space')
            .setDesc('Choose your space')
            .addDropdown(drop => {
                drop
                    .addOptions(spaceOptions)
                    .setValue(this.plugin.settings.space.selected)
                    .onChange(async (value) => {
                        this.plugin.settings.space.selected = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}


