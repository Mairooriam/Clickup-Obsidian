import { App, MarkdownView } from "obsidian";
import flatpickr from "flatpickr";

export function openFlatpickrTest(app: App, view: MarkdownView) {
	let top = "50%";
	let left = "50%";

	if (view) {
		const cursorEl = view.containerEl.querySelector<HTMLElement>(".cm-cursor");
		if (cursorEl) {
			const rect = cursorEl.getBoundingClientRect();
			top = `${rect.bottom}px`;
			left = `${rect.left}px`;
		}
	}

	const input = document.body.createEl("input");
	Object.assign(input.style, {
		position: "fixed",
		top,
		left,
		width: "0",
		height: "0",
		opacity: "0",
		border: "none",
		padding: "0",
	});

	const picker = flatpickr(input, {
		onChange: (_, dateStr) => console.log("[flatpickr hello world]", dateStr),
		onClose: () => input.remove(),
	});
	picker.open();
	picker.calendarContainer.setAttribute("tabindex", "-1");
	picker.calendarContainer.focus();
}
