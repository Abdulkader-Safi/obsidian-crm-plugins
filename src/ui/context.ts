import { getContext, setContext } from 'svelte';
import type { App } from 'obsidian';
import type { CrmStore } from '../crm/store';

export interface CrmContext {
	store: CrmStore;
	app: App;
	openNote: (path: string) => void;
	openModal: (key: string, props: Record<string, unknown>) => void;
}

const KEY = Symbol('crm');

export function setCrmContext(value: CrmContext): void {
	setContext(KEY, value);
}

export function getCrm(): CrmContext {
	return getContext<CrmContext>(KEY);
}
