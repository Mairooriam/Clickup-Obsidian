import MyPlugin from "main";
import { AuthMethodModal } from "ui/AuthMethodModal";

export async function cmdAuthenticate(plugin: MyPlugin) {
	new AuthMethodModal(plugin.app, (method) => {
		if (method === "OAuth") {
			plugin.settings.authMode = "oauth"
			console.log("oauth selected");
		} else {
			plugin.settings.authMode = "apikey"
			console.log("api selected");
		}
	}).open();
}
