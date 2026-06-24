import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
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

		new Setting(containerEl).setName('AI agents').setHeading();

		new Setting(containerEl)
			.setName('Install AI docs and templates')
			.setDesc(
				'Write a guide and entity templates into the CRM folder under _docs, so an AI agent (e.g. Claude) can learn the conventions. Reference _docs/CRM for AI agents.md from your CLAUDE.md.',
			)
			.addButton((btn) =>
				btn
					.setButtonText('Install')
					.setCta()
					.onClick(async () => {
						const path = await this.plugin.store.installAgentDocs();
						new Notice(`Installed CRM agent docs at ${path}`);
					}),
			);

		new Setting(containerEl).setName('Migration').setHeading();

		new Setting(containerEl)
			.setName('Migrate clients to deals')
			.setDesc(
				'Move legacy client sales fields (status, value, service) into Deal notes. Preview first; the migration never deletes data.',
			)
			.addButton((btn) =>
				btn.setButtonText('Preview').onClick(async () => {
					await this.plugin.refresh();
					const r = await this.plugin.store.migrateClientsToDeals({ dryRun: true });
					new Notice(
						r.created.length
							? `Will create ${r.created.length} deal(s); ${r.skipped.length} already migrated.`
							: 'Nothing to migrate.',
					);
				}),
			)
			.addButton((btn) =>
				btn
					.setButtonText('Run migration')
					.setCta()
					.onClick(async () => {
						await this.plugin.refresh();
						const r = await this.plugin.store.migrateClientsToDeals();
						new Notice(`Migrated ${r.created.length} client(s) to deals.`);
					}),
			);
	}
}
