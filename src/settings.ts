import { App, PluginSettingTab, Setting } from 'obsidian';
import type CrmPlugin from './main';

export interface CrmSettings {
	rootFolder: string;
	defaultCurrency: string;
}

export const DEFAULT_SETTINGS: CrmSettings = {
	rootFolder: 'CRM',
	defaultCurrency: 'USD',
};

export class CrmSettingTab extends PluginSettingTab {
	plugin: CrmPlugin;

	constructor(app: App, plugin: CrmPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('CRM folder')
			.setDesc('Folder where clients, projects, interactions, and tasks are stored.')
			.addText((text) =>
				text
					.setPlaceholder('CRM')
					.setValue(this.plugin.settings.rootFolder)
					.onChange(async (value) => {
						this.plugin.settings.rootFolder = value.trim() || 'CRM';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Default currency')
			.setDesc('Currency code applied to new clients and projects.')
			.addText((text) =>
				text
					.setPlaceholder('USD')
					.setValue(this.plugin.settings.defaultCurrency)
					.onChange(async (value) => {
						this.plugin.settings.defaultCurrency = value.trim() || 'USD';
						await this.plugin.saveSettings();
					}),
			);
	}
}
