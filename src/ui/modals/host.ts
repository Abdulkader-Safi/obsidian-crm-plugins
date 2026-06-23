import { App, Modal } from 'obsidian';
import { mount, unmount, type Component } from 'svelte';
import type CrmPlugin from '../../main';
import NewClient from './NewClient.svelte';
import LogInteraction from './LogInteraction.svelte';
import DeleteConfirm from './DeleteConfirm.svelte';
import NewProject from './NewProject.svelte';
import InteractionDetail from './InteractionDetail.svelte';

export type ModalKey =
	| 'new-client'
	| 'log-interaction'
	| 'delete-client'
	| 'new-project'
	| 'interaction-detail';

const COMPONENTS = {
	'new-client': NewClient,
	'log-interaction': LogInteraction,
	'delete-client': DeleteConfirm,
	'new-project': NewProject,
	'interaction-detail': InteractionDetail,
} as const;

export function openCrmModal(
	app: App,
	plugin: CrmPlugin,
	key: ModalKey,
	props: Record<string, unknown>,
): void {
	const modal = new Modal(app);
	modal.contentEl.addClass('app-root');
	let component: ReturnType<typeof mount> | undefined;

	modal.onOpen = () => {
		const Wrapper = COMPONENTS[key] as unknown as Component<Record<string, unknown>>;
		component = mount(Wrapper, {
			target: modal.contentEl,
			props: { ...props, store: plugin.store, close: () => modal.close() },
		});
	};
	modal.onClose = () => {
		if (component) void unmount(component);
		modal.contentEl.empty();
	};
	modal.open();
}
