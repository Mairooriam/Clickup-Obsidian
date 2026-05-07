import { App, MarkdownView } from "obsidian";
import flatpickr from "flatpickr";

export type FlatpickrMode = "single" | "range";

export function openFlatpickrTest(
	app: App,
	view: MarkdownView,
	mode: FlatpickrMode = "single",
	onSelect?: (dates: Date[], dateStr: string) => void,
) {
	const input = document.body.createEl("input");
	Object.assign(input.style, {
		position: "fixed",
		top: "50%",
		left: "50%",
		width: "0",
		height: "0",
		opacity: "0",
		border: "none",
		padding: "0",
	});

	const picker = flatpickr(input, {
		mode,
		weekNumbers: true,
		onChange: (dates: Date[], dateStr: string) => {
			const done = mode === "single" ? dates.length === 1 : dates.length === 2;
			if (done) {
				console.log("[flatpickr]", dateStr, dates);
				onSelect?.(dates, dateStr);
			}
		},
		onClose: () => input.remove(),
	});
	picker.open();
	picker.calendarContainer.setAttribute("tabindex", "-1");
	picker.calendarContainer.focus();
}
