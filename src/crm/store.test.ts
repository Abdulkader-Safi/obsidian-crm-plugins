import { test, expect, describe } from 'bun:test';
import { CrmStore, type VaultAdapter } from './store';
import type { NoteRecord } from './model';

class FakeAdapter implements VaultAdapter {
	notes: NoteRecord[] = [];
	created: { folder: string; name: string; frontmatter: Record<string, unknown>; body: string }[] = [];
	patched: { path: string; patch: Record<string, unknown> }[] = [];
	deleted: string[] = [];
	opened: string[] = [];

	listNotes(): NoteRecord[] {
		return this.notes;
	}
	async createNote(folder: string, name: string, frontmatter: Record<string, unknown>, body: string): Promise<string> {
		this.created.push({ folder, name, frontmatter, body });
		const path = `${folder}/${name}.md`;
		this.notes.push({ path, frontmatter, body });
		return path;
	}
	async updateFrontmatter(path: string, patch: Record<string, unknown>): Promise<void> {
		this.patched.push({ path, patch });
		const note = this.notes.find((n) => n.path === path);
		if (note) Object.assign(note.frontmatter, patch);
	}
	async deleteNote(path: string): Promise<void> {
		this.deleted.push(path);
		this.notes = this.notes.filter((n) => n.path !== path);
	}
	async openNote(path: string): Promise<void> {
		this.opened.push(path);
	}
}

function makeStore() {
	const adapter = new FakeAdapter();
	const store = new CrmStore(adapter, () => 'CRM');
	return { adapter, store };
}

describe('reindex + subscribe', () => {
	test('reindex builds model and notifies subscribers', () => {
		const { adapter, store } = makeStore();
		let calls = 0;
		store.subscribe(() => calls++);
		adapter.notes = [
			{ path: 'CRM/Clients/A.md', frontmatter: { crm: 'client', status: 'lead' }, body: '' },
		];
		store.reindex();
		expect(store.getModel().clients).toHaveLength(1);
		expect(calls).toBe(1);
	});

	test('unsubscribe stops notifications', () => {
		const { store } = makeStore();
		let calls = 0;
		const off = store.subscribe(() => calls++);
		off();
		store.reindex();
		expect(calls).toBe(0);
	});
});

describe('createClient', () => {
	test('writes a client note into the Clients folder and reindexes', async () => {
		const { adapter, store } = makeStore();
		const path = await store.createClient(
			{ name: 'CoolPeak AC', status: 'lead', currency: 'KWD', value: 1500 },
			'Notes',
		);
		expect(path).toBe('CRM/Clients/CoolPeak AC.md');
		expect(adapter.created[0]!.folder).toBe('CRM/Clients');
		expect(adapter.created[0]!.frontmatter.crm).toBe('client');
		expect(store.getModel().clients).toHaveLength(1);
	});
});

describe('logInteraction', () => {
	test('writes an interaction note linked to the client', async () => {
		const { adapter, store } = makeStore();
		await store.logInteraction(
			{ clientName: 'CoolPeak AC', type: 'email', date: '2026-06-21', title: 'Follow-up call' },
			'Discussed proposal',
		);
		const created = adapter.created[0]!;
		expect(created.folder).toBe('CRM/Interactions');
		expect(created.frontmatter.client).toBe('[[CoolPeak AC]]');
		expect(created.body).toBe('Discussed proposal');
		expect(created.name).toContain('CoolPeak AC');
	});
});

describe('toggleTask', () => {
	test('patches the done field', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Tasks/T.md', frontmatter: { crm: 'task', done: false }, body: '' },
		];
		store.reindex();
		await store.toggleTask('CRM/Tasks/T.md', true);
		expect(adapter.patched[0]).toEqual({ path: 'CRM/Tasks/T.md', patch: { done: true } });
	});
});

describe('deleteClient', () => {
	test('deletes the client note and all linked notes', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Clients/CoolPeak AC.md', frontmatter: { crm: 'client', status: 'lead' }, body: '' },
			{ path: 'CRM/Projects/Site.md', frontmatter: { crm: 'project', client: '[[CoolPeak AC]]' }, body: '' },
			{ path: 'CRM/Interactions/Call.md', frontmatter: { crm: 'interaction', client: '[[CoolPeak AC]]' }, body: '' },
			{ path: 'CRM/Tasks/Todo.md', frontmatter: { crm: 'task', client: '[[CoolPeak AC]]' }, body: '' },
		];
		store.reindex();
		const client = store.getModel().clients[0]!;
		await store.deleteClient(client);
		expect(adapter.deleted.sort()).toEqual(
			['CRM/Clients/CoolPeak AC.md', 'CRM/Interactions/Call.md', 'CRM/Projects/Site.md', 'CRM/Tasks/Todo.md'].sort(),
		);
	});
});
