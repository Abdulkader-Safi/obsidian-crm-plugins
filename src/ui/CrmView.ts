import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import type CrmPlugin from '../main';

export const CRM_VIEW_TYPE = 'crm-view';

export class CrmView extends ItemView {
	private component: ReturnType<typeof mount> | undefined;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: CrmPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return CRM_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'CRM';
	}

	getIcon(): string {
		return 'contact';
	}

	async onOpen(): Promise<void> {
		await this.plugin.refresh();
		const { default: Root } = await import('./Root.svelte');
		this.component = mount(Root, {
			target: this.contentEl,
			props: {
				ctx: {
					store: this.plugin.store,
					app: this.app,
					openNote: (path: string) => void this.plugin.store.openNote(path),
					openModal: () => {},
				},
			},
		});
	}

	async onClose(): Promise<void> {
		if (this.component) {
			void unmount(this.component);
			this.component = undefined;
		}
	}
}
