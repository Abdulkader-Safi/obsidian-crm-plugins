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
		expect(m.clients[0]!.value).toBe(1500);
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

	test('defaults unknown client status to lead', () => {
		const m = buildModel([
			{ path: 'CRM/Clients/X.md', frontmatter: { crm: 'client' }, body: '' },
		]);
		expect(m.clients[0]!.status).toBe('lead');
	});
});
