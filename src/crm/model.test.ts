import { test, expect, describe } from 'bun:test';
import { buildModel, emptyModel, type NoteRecord } from './model';

const notes: NoteRecord[] = [
	{
		path: 'CRM/Clients/CoolPeak AC.md',
		frontmatter: { crm: 'client', status: 'lead', value: 1500, currency: 'KWD' },
		body: 'Some notes',
	},
	{
		path: 'CRM/Projects/CoolPeak Site.md',
		frontmatter: {
			crm: 'project',
			client: '[[CoolPeak AC]]',
			status: 'discovery',
			progress: 35,
			budget: 1500,
			currency: 'KWD',
		},
		body: '',
	},
	{
		path: 'CRM/Interactions/2026-06-21 Call.md',
		frontmatter: {
			crm: 'interaction',
			client: '[[CoolPeak AC]]',
			type: 'email',
			date: '2026-06-21',
			title: 'Follow-up call',
		},
		body: 'Discussed the proposal.',
	},
	{
		path: 'CRM/Tasks/Send proposal.md',
		frontmatter: { crm: 'task', client: '[[CoolPeak AC]]', done: false, due: '2026-07-02' },
		body: 'Send the proposal PDF.',
	},
	{
		path: 'CRM/Notes/Unrelated.md',
		frontmatter: {},
		body: 'not a crm note',
	},
];

describe('emptyModel', () => {
	test('returns empty arrays', () => {
		const m = emptyModel();
		expect(m.clients).toEqual([]);
		expect(m.projects).toEqual([]);
	});
});

describe('buildModel', () => {
	test('indexes one client', () => {
		const m = buildModel(notes);
		expect(m.clients).toHaveLength(1);
		expect(m.clients[0]!.name).toBe('CoolPeak AC');
		expect(m.clients[0]!.currency).toBe('KWD');
	});

	test('attaches interaction, task, and project to the client', () => {
		const client = buildModel(notes).clients[0]!;
		expect(client.interactions).toHaveLength(1);
		expect(client.interactions[0]!.summary).toBe('Discussed the proposal.');
		expect(client.tasks).toHaveLength(1);
		expect(client.tasks[0]!.description).toBe('Send the proposal PDF.');
		expect(client.projects).toHaveLength(1);
		expect(client.projects[0]!.progress).toBe(35);
	});

	test('ignores notes without a crm field', () => {
		const m = buildModel(notes);
		const total =
			m.clients.length + m.projects.length + m.interactions.length + m.tasks.length;
		expect(total).toBe(4);
	});


	test('reads client tags from an array or a single value', () => {
		const m = buildModel([
			{ path: 'CRM/Clients/A.md', frontmatter: { crm: 'client', tags: ['hot-lead', 'cafe'] }, body: '' },
			{ path: 'CRM/Clients/B.md', frontmatter: { crm: 'client', tags: 'referral' }, body: '' },
		]);
		expect(m.clients.find((c) => c.name === 'A')!.tags).toEqual(['hot-lead', 'cafe']);
		expect(m.clients.find((c) => c.name === 'B')!.tags).toEqual(['referral']);
	});

	test('reads project service, payment terms, and milestones', () => {
		const m = buildModel([
			{
				path: 'CRM/Projects/Site.md',
				frontmatter: {
					crm: 'project',
					status: 'development',
					service: 'Website',
					paymentTerms: '50% upfront',
					milestones: [
						{ title: 'Discovery', done: true },
						{ title: 'Design', done: false },
					],
				},
				body: '',
			},
		]);
		const p = m.projects[0]!;
		expect(p.service).toBe('Website');
		expect(p.paymentTerms).toBe('50% upfront');
		expect(p.milestones).toHaveLength(2);
		expect(p.milestones[0]).toEqual({ title: 'Discovery', done: true });
	});

	test('indexes deals and attaches them to clients', () => {
		const m = buildModel([
			{ path: 'CRM/Clients/CoolPeak AC.md', frontmatter: { crm: 'client' }, body: '' },
			{
				path: 'CRM/Deals/CoolPeak Website.md',
				frontmatter: { crm: 'deal', client: '[[CoolPeak AC]]', stage: 'proposal', value: 1500 },
				body: '',
			},
		]);
		expect(m.deals).toHaveLength(1);
		const client = m.clients[0]!;
		expect(client.deals).toHaveLength(1);
		expect(client.deals[0]!.stage).toBe('proposal');
	});

	test('derives client relationship from deals and projects', () => {
		const m = buildModel([
			{ path: 'CRM/Clients/Prospect.md', frontmatter: { crm: 'client' }, body: '' },
			{ path: 'CRM/Clients/Active.md', frontmatter: { crm: 'client' }, body: '' },
			{ path: 'CRM/Clients/Past.md', frontmatter: { crm: 'client' }, body: '' },
			{ path: 'CRM/Deals/D1.md', frontmatter: { crm: 'deal', client: '[[Active]]', stage: 'negotiating' }, body: '' },
			{ path: 'CRM/Deals/D2.md', frontmatter: { crm: 'deal', client: '[[Past]]', stage: 'won' }, body: '' },
		]);
		const byName = (n: string) => m.clients.find((c) => c.name === n)!;
		expect(byName('Prospect').relationship).toBe('prospect');
		expect(byName('Active').relationship).toBe('active');
		expect(byName('Past').relationship).toBe('past');
	});

	test('derives project progress from completed tasks', () => {
		const m = buildModel([
			{ path: 'CRM/Projects/Site.md', frontmatter: { crm: 'project', status: 'development', progress: 0 }, body: '' },
			{ path: 'CRM/Tasks/A.md', frontmatter: { crm: 'task', project: '[[Site]]', done: true }, body: 'A' },
			{ path: 'CRM/Tasks/B.md', frontmatter: { crm: 'task', project: '[[Site]]', done: true }, body: 'B' },
			{ path: 'CRM/Tasks/C.md', frontmatter: { crm: 'task', project: '[[Site]]', done: false }, body: 'C' },
		]);
		expect(m.projects[0]!.progress).toBe(67);
	});

	test('derives project progress from milestones when there are no tasks', () => {
		const m = buildModel([
			{
				path: 'CRM/Projects/Site.md',
				frontmatter: {
					crm: 'project',
					status: 'development',
					progress: 0,
					milestones: [
						{ title: 'A', done: true },
						{ title: 'B', done: false },
					],
				},
				body: '',
			},
		]);
		expect(m.projects[0]!.progress).toBe(50);
	});

	test('resolves a project deal link', () => {
		const m = buildModel([
			{
				path: 'CRM/Projects/Site.md',
				frontmatter: { crm: 'project', status: 'discovery', deal: '[[CoolPeak Website]]' },
				body: '',
			},
		]);
		expect(m.projects[0]!.deal).toBe('CoolPeak Website');
	});
});
