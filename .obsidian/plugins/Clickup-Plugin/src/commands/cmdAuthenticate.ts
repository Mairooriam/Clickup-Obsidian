import MyPlugin from "main";
import { AuthMethodModal } from "ui/AuthMethodModal";
import { Errors } from "taskParser";
import { PromptApiKeyModal } from "ui/PromtApiKeyModal";
import { Notice } from "obsidian";
import { askYesNo } from "ui/YesNoModal";

async function authenticateWithApiKey(plugin: MyPlugin) {
	new PromptApiKeyModal(plugin.app, async (apiKey) => {
		plugin.api.updateToken(apiKey);
		const [err, resp] = await Errors.catchError(plugin.api.getAuthorizedUser());
		if (err) {
			return false;
		}
		plugin.settings.apiKey = apiKey;
		await plugin.saveSettings();
		new Notice(`Succesfully authenticated: ${resp.username}`);
		return true;
	}).open();
}

async function promtAuthenticationModeAndSet(plugin: MyPlugin) {
	new AuthMethodModal(plugin.app, (method) => {
		if (method === "OAuth") {
			plugin.settings.authMode = "oauth";
			plugin.saveSettings();
			console.log("oauth selected");
		} else {
			plugin.settings.authMode = "apikey";
			plugin.saveSettings();
			authenticateWithApiKey(plugin);
		}
	}).open();

}

export async function cmdAuthenticate(plugin: MyPlugin) {
	const [err, resp] = await Errors.catchError(plugin.api.getAuthorizedUser());
	if (err) {
		promtAuthenticationModeAndSet(plugin);
	} else {
		const yes = await askYesNo(plugin.app, `Do you want to re-authenticate? Already authenticated with: ${resp.username}`);
		if (yes) {
			authenticateWithApiKey(plugin);
		} else {
			const change = await askYesNo(plugin.app, "Do you want to change authentication mode?");
			if (change) promtAuthenticationModeAndSet(plugin);
		}
	}

}
