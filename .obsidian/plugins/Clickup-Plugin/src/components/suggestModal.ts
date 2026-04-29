import { App, SuggestModal } from "obsidian";
import type { Team } from "taskParser/api/types";

export class GenericSuggestModal<T> extends SuggestModal<T> {
    constructor(
        app: App,
        private items: T[],
        private getItemText: (item: T) => string,
        private onChoose: (item: T) => void
    ) {
        super(app);
    }

    getSuggestions(query: string): T[] {
        return this.items.filter(item =>
            this.getItemText(item).toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(item: T, el: HTMLElement) {
        el.setText(this.getItemText(item));
    }

    onChooseSuggestion(item: T) {
        this.onChoose(item);
    }
}
