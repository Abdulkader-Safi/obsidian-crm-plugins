import { test, expect, describe } from 'bun:test';
import { buildModel, emptyModel, type NoteRecord } from './model';

const notes: NoteRecord[] = [
	{
		path: 'CRM/Clients/CoolPeak AC.md',
		frontmatter: { crm: 'client', currency: 'KWD' },
		body: `Some notes

## Tasks
- [ ] Send the proposal PDF

## Interactions
- 2026-06-21 | email | Follow-up call | Discussed the proposal.`,
	},
	{
		path: 'CRM/Projects/CoolPeak Site.md',
		frontmatter: { crm: 'project', client: '[[CoolPeak AC]]', status: 'discovery', budget: 1500, currency: 'KWD' },
		body: '',
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

	test('parses inline interaction, task, and the project', () => {
		const client = buildModel(notes).clients[0]!;
		expect(client.interactions).toHaveLength(1);
		expect(client.interactions[0]!.summary).toBe('Discussed the proposal.');
		expect(client.tasks).toHaveLength(1);
		expect(client.tasks[0]!.description).toBe('Send the proposal PDF');
		expect(client.tasks[0]!.inline).toBe(true);
		expect(client.projects).toHaveLength(1);
	});

	test('ignores notes without a crm field', () => {
		const m = buildModel(notes);
		const total = m.clients.length + m.projects.length + m.interactions.length + m.tasks.length;
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

	test('reads project payment terms and milestones', () => {
		const m = buildModel([
			{
				path: 'CRM/Projects/Site.md',
				frontmatter: {
					crm: 'project',
					status: 'development',
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
		expect(p.paymentTerms).toBe('50% upfront');
		expect(p.milestones).toHaveLength(2);
	});

	test('indexes deals, attaches them, and parses deal interactions inline', () => {
		const m = buildModel([
			{ path: 'CRM/Clients/CoolPeak AC.md', frontmatter: { crm: 'client' }, body: '' },
			{
				path: 'CRM/Deals/CoolPeak Website.md',
				frontmatter: { crm: 'deal', client: '[[CoolPeak AC]]', stage: 'proposal', value: 1500 },
				body: `Opportunity notes

## Interactions
- 2026-06-20 | call | Intro | Talked scope.`,
			},
		]);
		expect(m.deals).toHaveLength(1);
		expect(m.deals[0]!.notes).toBe('Opportunity notes');
		expect(m.deals[0]!.interactions).toHaveLength(1);
		const client = m.clients[0]!;
		expect(client.deals).toHaveLength(1);
		// the deal's interaction shows in the client timeline
		expect(client.interactions).toHaveLength(1);
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

	test('derives project progress from completed inline tasks', () => {
		const m = buildModel([
			{
				path: 'CRM/Projects/Site.md',
				frontmatter: { crm: 'project', status: 'development' },
				body: `## Tasks
- [x] A
- [x] B
- [ ] C`,
			},
		]);
		expect(m.projects[0]!.progress).toBe(67);
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
