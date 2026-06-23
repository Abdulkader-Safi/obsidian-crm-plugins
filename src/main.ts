import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, CrmSettingTab } from './settings';
import type { CrmSettings } from './settings';
import { CrmView, CRM_VIEW_TYPE } from './ui/CrmView';
import { CrmStore } from './crm/store';
import { ObsidianVaultAdapter } from './crm/obsidian-adapter';

export default class CrmPlugin extends Plugin {
	settings!: CrmSettings;
	adapter!: ObsidianVaultAdapter;
	store!: CrmStore;
	private vaultChangeTimer: number | null = null;

	async onload() {
		await this.loadSettings();

		this.adapter = new ObsidianVaultAdapter(this.app, () => this.settings.rootFolder);
		this.store = new CrmStore(this.adapter, () => this.settings.rootFolder);

		this.registerView(CRM_VIEW_TYPE, (leaf) => new CrmView(leaf, this));

		this.addRibbonIcon('contact', 'Open CRM', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-crm',
			name: 'Open view',
			callback: () => void this.activateView(),
		});

		this.addSettingTab(new CrmSettingTab(this.app, this));

		this.registerEvent(this.app.vault.on('create', () => this.onVaultChange()));
		this.registerEvent(this.app.vault.on('modify', () => this.onVaultChange()));
		this.registerEvent(this.app.vault.on('delete', () => this.onVaultChange()));
		this.registerEvent(this.app.vault.on('rename', () => this.onVaultChange()));
		this.registerEvent(this.app.metadataCache.on('resolved', () => this.onVaultChange()));
	}

	onunload() {}

	private onVaultChange(): void {
		if (this.vaultChangeTimer !== null) window.clearTimeout(this.vaultChangeTimer);
		this.vaultChangeTimer = window.setTimeout(() => {
			void this.refresh();
		}, 300);
	}

	async refresh(): Promise<void> {
		await this.adapter.refresh();
		this.store.reindex();
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(CRM_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: CRM_VIEW_TYPE, active: true });
		}
		await workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<CrmSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
