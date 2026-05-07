import { App, Modal, Setting } from "obsidian";

/**
 * Opens a modal with a native date picker.
 * @param app Obsidian App instance
 * @param current Existing date value in YYYY-MM-DD format (or empty string)
 * @param onSubmit Called with the chosen date string, or empty string if removed
 */
export function openDatePicker(app: App, current: string, onSubmit: (date: string) => void): void {
	new DatePickerModal(app, current, onSubmit).open();
}

class DatePickerModal extends Modal {
	private value: string;
	private onSubmit: (date: string) => void;

	constructor(app: App, current: string, onSubmit: (date: string) => void) {
		super(app);
		this.value = current;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl, modalEl } = this;

		// Hide modal chrome — only the date input will be visible
		modalEl.style.cssText = "background:transparent;border:none;box-shadow:none;padding:0;";
		(modalEl.closest(".modal-bg") as HTMLElement | null)?.style.setProperty("background", "transparent");

		new Setting(contentEl)
			.addText(text => {
				text.inputEl.type = "date";
				text.setValue(this.value);
				text.onChange(v => { this.value = v; });
				text.inputEl.addEventListener("keydown", e => {
					if (e.key === "Enter") this.submit(this.value);
				});
				setTimeout(() => {
					text.inputEl.focus();
					text.inputEl.showPicker?.();
				}, 50);
			});
	}

	private submit(value: string) {
		this.close();
		this.onSubmit(value);
	}

	onClose() {
		this.contentEl.empty();
	}
}
