import { GenericSuggestModal } from "ui/suggestModal";
import { App } from "obsidian";

export async function selectFromModal<T>(
	app: App,
	items: T[],
	getItemText: (item: T) => string
): Promise<T | null> {
	return new Promise((resolve) => {
		new GenericSuggestModal<T>(
			app,
			items,
			getItemText,
			(item: T) => resolve(item)
		).open();
	});
}
