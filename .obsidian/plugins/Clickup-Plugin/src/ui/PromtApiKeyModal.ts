import { Modal, App, Setting } from "obsidian";

export class PromptApiKeyModal extends Modal {
  onSubmit: (apiKey: string) => Promise<boolean>;

  constructor(app: App, onSubmit: (apiKey: string) => Promise<boolean>) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    let value = "";
    this.contentEl.createEl("h2", { text: "Enter ClickUp API Key" });
    new Setting(this.contentEl)
      .setName("API Key")
      .addText(text => text
        .setPlaceholder("Paste your API key")
        .onChange(val => value = val)
      );
    const errorEl = this.contentEl.createEl("p", { text: "", cls: "clickup-auth-error" });
    errorEl.style.color = "var(--text-error)";
    new Setting(this.contentEl)
      .addButton(btn => btn
        .setButtonText("Submit")
        .setCta()
        .onClick(async () => {
          btn.setButtonText("Verifying...").setDisabled(true);
          errorEl.setText("");
          const ok = await this.onSubmit(value);
          if (ok) {
            this.close();
          } else {
            errorEl.setText("Invalid API key. Please try again.");
            btn.setButtonText("Submit").setDisabled(false);
          }
        })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}
