import { Modal, App, ButtonComponent } from "obsidian";

export function askYesNo(app: App, question: string): Promise<boolean> {
    return new Promise((resolve) => {
        new YesNoModal(app, question, (yes) => resolve(yes)).open();
    });
}

export class YesNoModal extends Modal {
    result: boolean | null = null;
    constructor(app: App, private question: string, private onResult: (yes: boolean) => void) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("p", { text: this.question });

        const buttonContainer = contentEl.createDiv({ cls: "yes-no-buttons" });

        new ButtonComponent(buttonContainer)
            .setButtonText("Yes")
            .onClick(() => {
                this.result = true;
                this.close();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText("No")
            .onClick(() => {
                this.result = false;
                this.close();
            });
    }

    onClose() {
        this.contentEl.empty();
        if (this.result !== null) {
            this.onResult(this.result);
        }
    }
}
