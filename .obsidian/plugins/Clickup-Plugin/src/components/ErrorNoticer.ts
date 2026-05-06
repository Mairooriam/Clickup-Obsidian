import { Notice } from "obsidian";
import { Errors } from "taskParser";


export function noticeErrors(err: Error) {
	if (err instanceof Errors.AuthError) {
		new Notice("Authentication failed. Please check your API token.");
	} else {
		new Notice("Error: " + err.message);
	}
}
