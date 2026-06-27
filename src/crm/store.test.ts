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
	async editBody(path: string, transform: (body: string) => string): Promise<void> {
		const note = this.notes.find((n) => n.path === path);
		if (note) note.body = transform(note.body);
	}
	docs: { path: string; content: string }[] = [];
	async writeDoc(path: string, content: string): Promise<void> {
		this.docs.push({ path, content });
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
		adapter.notes = [{ path: 'CRM/Clients/A.md', frontmatter: { crm: 'client' }, body: '' }];
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

describe('currency migration', () => {
	test('currenciesInUse returns distinct currencies across clients, projects, and deals', () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Clients/A.md', frontmatter: { crm: 'client', currency: 'KWD' }, body: '' },
			{ path: 'CRM/Deals/D.md', frontmatter: { crm: 'deal', client: '[[A]]', stage: 'lead', currency: 'USD' }, body: '' },
			{ path: 'CRM/Projects/P.md', frontmatter: { crm: 'project', client: '[[A]]', status: 'discovery', currency: 'KWD' }, body: '' },
		];
		store.reindex();
		expect(store.currenciesInUse().sort()).toEqual(['KWD', 'USD']);
	});

	test('setAllCurrencies rewrites every differing note and returns the count', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Clients/A.md', frontmatter: { crm: 'client', currency: 'KWD' }, body: '' },
			{ path: 'CRM/Deals/D.md', frontmatter: { crm: 'deal', client: '[[A]]', stage: 'lead', currency: 'USD' }, body: '' },
			{ path: 'CRM/Projects/P.md', frontmatter: { crm: 'project', client: '[[A]]', status: 'discovery', currency: 'USD' }, body: '' },
		];
		store.reindex();
		const changed = await store.setAllCurrencies('USD');
		expect(changed).toBe(1); // only the KWD client differed
		expect(store.currenciesInUse()).toEqual(['USD']);
	});
});

describe('createClient', () => {
	test('writes an account note into the Clients folder', async () => {
		const { adapter, store } = makeStore();
		const path = await store.createClient({ name: 'CoolPeak AC', company: 'CoolPeak', currency: 'KWD' });
		expect(path).toBe('CRM/Clients/CoolPeak AC.md');
		expect(adapter.created[0]!.folder).toBe('CRM/Clients');
		expect(adapter.created[0]!.frontmatter.crm).toBe('client');
		expect(store.getModel().clients).toHaveLength(1);
	});
});

describe('logInteraction (inline)', () => {
	test('appends an interaction bullet to the target note body', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [{ path: 'CRM/Deals/D.md', frontmatter: { crm: 'deal', client: '[[A]]', stage: 'lead' }, body: 'Comment.' }];
		store.reindex();
		await store.logInteraction('CRM/Deals/D.md', { date: '2026-06-21', type: 'email', title: 'Follow-up', summary: 'Discussed proposal' });
		const deal = store.getModel().deals[0]!;
		expect(deal.interactions).toHaveLength(1);
		expect(deal.interactions[0]!.title).toBe('Follow-up');
		expect(deal.notes).toBe('Comment.');
	});

	test('a next action becomes an inline task on the same note', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [{ path: 'CRM/Clients/A.md', frontmatter: { crm: 'client' }, body: '' }];
		store.reindex();
		await store.logInteraction('CRM/Clients/A.md', { date: '2026-06-21', type: 'call', title: 'Call', summary: '' }, 'Send the quote');
		const client = store.getModel().clients[0]!;
		expect(client.tasks).toHaveLength(1);
		expect(client.tasks[0]!.description).toBe('Send the quote');
	});
});

describe('addTask + toggleTask (inline)', () => {
	test('adds a checkbox and toggles it in the note body', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [{ path: 'CRM/Projects/P.md', frontmatter: { crm: 'project', status: 'discovery' }, body: '' }];
		store.reindex();
		await store.addTask('CRM/Projects/P.md', 'Build homepage');
		let project = store.getModel().projects[0]!;
		expect(project.tasks).toHaveLength(1);
		expect(project.tasks[0]!.done).toBe(false);
		await store.toggleTask(project.tasks[0]!, true);
		project = store.getModel().projects[0]!;
		expect(project.tasks[0]!.done).toBe(true);
		expect(project.progress).toBe(100);
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
		expect(adapter.created[0]!.frontmatter.client).toBe('[[CoolPeak AC]]');
		expect(store.getModel().projects).toHaveLength(1);
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
		expect(store.getModel().deals).toHaveLength(1);
	});
});

describe('setDealStage', () => {
	test('patches the deal stage', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [{ path: 'CRM/Deals/D.md', frontmatter: { crm: 'deal', stage: 'lead' }, body: '' }];
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
		expect(deal.frontmatter.stage).toBe('proposal');
		expect(adapter.created.find((c) => c.frontmatter.client === '[[Done Co]]')!.frontmatter.stage).toBe('won');
		const client = adapter.notes.find((n) => n.path === 'CRM/Clients/CoolPeak AC.md')!;
		expect('status' in client.frontmatter).toBe(false);

		const again = await store.migrateClientsToDeals();
		expect(again.created).toHaveLength(0);
	});
});

describe('installAgentDocs', () => {
	test('writes the guide and templates under _docs', async () => {
		const { adapter, store } = makeStore();
		const guide = await store.installAgentDocs();
		expect(guide).toBe('CRM/_docs/CRM for AI agents.md');
		const paths = adapter.docs.map((d) => d.path);
		expect(paths).toContain('CRM/_docs/Templates/Client.md');
		expect(paths).toContain('CRM/_docs/Templates/Deal.md');
		expect(paths).toContain('CRM/_docs/Templates/Project.md');
		expect(adapter.docs.find((d) => d.path === guide)!.content).toContain('crm: deal');
	});
});

describe('deleteClient', () => {
	test('deletes the client note plus its projects and deals', async () => {
		const { adapter, store } = makeStore();
		adapter.notes = [
			{ path: 'CRM/Clients/CoolPeak AC.md', frontmatter: { crm: 'client' }, body: '' },
			{ path: 'CRM/Projects/Site.md', frontmatter: { crm: 'project', client: '[[CoolPeak AC]]' }, body: '' },
			{ path: 'CRM/Deals/Web.md', frontmatter: { crm: 'deal', client: '[[CoolPeak AC]]' }, body: '' },
		];
		store.reindex();
		const client = store.getModel().clients[0]!;
		await store.deleteClient(client);
		expect(adapter.deleted.sort()).toEqual(['CRM/Clients/CoolPeak AC.md', 'CRM/Deals/Web.md', 'CRM/Projects/Site.md'].sort());
	});
});
