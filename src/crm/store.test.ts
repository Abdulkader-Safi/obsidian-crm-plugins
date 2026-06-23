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
	async removeFrontmatterKeys(path: string, keys: string[]): Promise<void> {
		const note = this.notes.find((n) => n.path === path);
		if (note) for (const key of keys) delete note.frontmatter[key];
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

describe('createProject', () => {
	test('writes a project note linked to the client', async () => {
		const { adapter, store } = makeStore();
		const path = await store.createProject(
			{ name: 'CoolPeak Site', clientName: 'CoolPeak AC', status: 'discovery', currency: 'KWD', budget: 900 },
			'Scope notes',
		);
		expect(path).toBe('CRM/Projects/CoolPeak Site.md');
		const created = adapter.created[0]!;
		expect(created.folder).toBe('CRM/Projects');
		expect(created.frontmatter.crm).toBe('project');
		expect(created.frontmatter.client).toBe('[[CoolPeak AC]]');
		expect(created.frontmatter.budget).toBe(900);
		expect(store.getModel().projects).toHaveLength(1);
	});
});

describe('setClientStatus', () => {
	test('patches the client status', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Clients/A.md', frontmatter: { crm: 'client', status: 'lead' }, body: '' },
		];
		store.reindex();
		await store.setClientStatus('CRM/Clients/A.md', 'active');
		expect(adapter.patched[0]).toEqual({ path: 'CRM/Clients/A.md', patch: { status: 'active' } });
		expect(store.getModel().clients[0]!.status).toBe('active');
	});
});

describe('createDeal', () => {
	test('writes a deal note in the Deals folder linked to the client', async () => {
		const { adapter, store } = makeStore();
		const path = await store.createDeal({
			name: 'CoolPeak Website',
			clientName: 'CoolPeak AC',
			stage: 'lead',
			currency: 'KWD',
			value: 1500,
			service: 'Website',
		});
		expect(path).toBe('CRM/Deals/CoolPeak Website.md');
		expect(adapter.created[0]!.folder).toBe('CRM/Deals');
		expect(adapter.created[0]!.frontmatter.crm).toBe('deal');
		expect(adapter.created[0]!.frontmatter.client).toBe('[[CoolPeak AC]]');
		expect(store.getModel().deals).toHaveLength(1);
	});
});

describe('setDealStage', () => {
	test('patches the deal stage', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Deals/D.md', frontmatter: { crm: 'deal', stage: 'lead' }, body: '' },
		];
		store.reindex();
		await store.setDealStage('CRM/Deals/D.md', 'won');
		expect(adapter.patched[0]).toEqual({ path: 'CRM/Deals/D.md', patch: { stage: 'won' } });
	});
});

describe('convertDealToProject', () => {
	test('creates a project linked to the deal and marks the deal won', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Deals/CoolPeak Website.md', frontmatter: { crm: 'deal', client: '[[CoolPeak AC]]', stage: 'negotiating' }, body: '' },
		];
		store.reindex();
		const deal = store.getModel().deals[0]!;
		await store.convertDealToProject(deal, { name: 'CoolPeak Site', status: 'discovery', currency: 'KWD' });
		const created = adapter.created[0]!;
		expect(created.folder).toBe('CRM/Projects');
		expect(created.frontmatter.deal).toBe('[[CoolPeak Website]]');
		expect(created.frontmatter.client).toBe('[[CoolPeak AC]]');
		expect(adapter.patched.find((p) => p.path === 'CRM/Deals/CoolPeak Website.md')?.patch).toEqual({ stage: 'won' });
	});
});

describe('migrateClientsToDeals', () => {
	test('creates deals from legacy client fields and strips them, idempotently', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Clients/CoolPeak AC.md', frontmatter: { crm: 'client', status: 'proposal', value: 1500, currency: 'KWD', service: 'Website', leadSource: 'Web' }, body: '' },
			{ path: 'CRM/Clients/Done Co.md', frontmatter: { crm: 'client', status: 'completed', value: 800, currency: 'KWD' }, body: '' },
		];
		store.reindex();

		const preview = await store.migrateClientsToDeals({ dryRun: true });
		expect(preview.created.sort()).toEqual(['CoolPeak AC', 'Done Co']);
		expect(adapter.created).toHaveLength(0);

		const result = await store.migrateClientsToDeals();
		expect(result.created.sort()).toEqual(['CoolPeak AC', 'Done Co']);
		const deal = adapter.created.find((c) => c.frontmatter.client === '[[CoolPeak AC]]')!;
		expect(deal.folder).toBe('CRM/Deals');
		expect(deal.frontmatter.stage).toBe('proposal');
		expect(deal.frontmatter.value).toBe(1500);
		// completed maps to won
		expect(adapter.created.find((c) => c.frontmatter.client === '[[Done Co]]')!.frontmatter.stage).toBe('won');
		// legacy keys stripped
		const client = adapter.notes.find((n) => n.path === 'CRM/Clients/CoolPeak AC.md')!;
		expect('status' in client.frontmatter).toBe(false);
		expect('value' in client.frontmatter).toBe(false);

		// second run is a no-op (clients already have deals)
		const again = await store.migrateClientsToDeals();
		expect(again.created).toHaveLength(0);
	});
});

describe('deleteProject', () => {
	test('deletes the project note and its tasks', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Projects/Site.md', frontmatter: { crm: 'project', status: 'discovery' }, body: '' },
			{ path: 'CRM/Tasks/T.md', frontmatter: { crm: 'task', project: '[[Site]]' }, body: '' },
			{ path: 'CRM/Tasks/Other.md', frontmatter: { crm: 'task' }, body: '' },
		];
		store.reindex();
		const project = store.getModel().projects[0]!;
		await store.deleteProject(project);
		expect(adapter.deleted.sort()).toEqual(['CRM/Projects/Site.md', 'CRM/Tasks/T.md'].sort());
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
