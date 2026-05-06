import { Plugin, SuggestModal, App } from "obsidian";


export class AuthMethodModal extends SuggestModal<string> {
	constructor(app: App, private onChoose: (method: string) => void) {
		super(app);
		this.setPlaceholder("Select authentication method");
	}
	getSuggestions(query: string) {
		return ["OAuth", "API Key"].filter(m => m.toLowerCase().includes(query.toLowerCase()));
	}
	renderSuggestion(method: string, el: HTMLElement) {
		el.createEl("div", { text: method });
	}
	onChooseSuggestion(method: string) {
		this.onChoose(method);
	}
}

