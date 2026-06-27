import { buildModel, emptyModel, type NoteRecord } from './model';
import {
	clientFrontmatter,
	projectFrontmatter,
	dealFrontmatter,
	noteBasename,
	asString,
	asNumber,
	type ClientInput,
	type ProjectInput,
	type DealInput,
} from './frontmatter';
import { appendTask, appendInteraction, setTaskDone } from './body';
import { agentDocs } from './docs';
import type { Client, CrmModel, Project, Deal, DealStage, Task } from './types';

export interface InteractionEntry {
	date: string;
	type: string;
	title: string;
	summary: string;
}

const LEGACY_SALES_KEYS = ['status', 'value', 'service', 'leadSource', 'nextFollowUp', 'followUpNote'];

function legacyStatusToStage(status: string): DealStage {
	switch (status) {
		case 'proposal':
			return 'proposal';
		case 'negotiating':
		case 'onhold':
			return 'negotiating';
		case 'active':
		case 'completed':
			return 'won';
		case 'lost':
			return 'lost';
		default:
			return 'lead';
	}
}

export interface MigrationSummary {
	created: string[];
	skipped: string[];
}

export interface VaultAdapter {
	listNotes(): NoteRecord[];
	createNote(
		folder: string,
		name: string,
		frontmatter: Record<string, unknown>,
		body: string,
	): Promise<string>;
	updateFrontmatter(path: string, patch: Record<string, unknown>): Promise<void>;
	removeFrontmatterKeys(path: string, keys: string[]): Promise<void>;
	editBody(path: string, transform: (body: string) => string): Promise<void>;
	writeDoc(path: string, content: string): Promise<void>;
	deleteNote(path: string): Promise<void>;
	openNote(path: string): Promise<void>;
}

function sanitizeFileName(name: string): string {
	return name.replace(/[\\/:*?"<>|#^[\]]/g, '').trim() || 'Untitled';
}

export class CrmStore {
	private model: CrmModel = emptyModel();
	private listeners = new Set<() => void>();

	constructor(
		private adapter: VaultAdapter,
		private rootFolder: () => string,
	) {}

	getModel(): CrmModel {
		return this.model;
	}

	/** Distinct currency codes currently used across clients, projects, and deals. */
	currenciesInUse(): string[] {
		const { clients, projects, deals } = this.model;
		const all = [...clients, ...projects, ...deals].map((e) => e.currency).filter(Boolean);
		return [...new Set(all)];
	}

	/** Rewrite the currency frontmatter on every client, project, and deal note. Returns the count changed. */
	async setAllCurrencies(to: string): Promise<number> {
		const { clients, projects, deals } = this.model;
		const targets = [...clients, ...projects, ...deals].filter((e) => e.currency !== to);
		for (const e of targets) {
			await this.adapter.updateFrontmatter(e.path, { currency: to });
		}
		this.reindex();
		return targets.length;
	}

	subscribe(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => {
			this.listeners.delete(fn);
		};
	}

	private emit(): void {
		for (const fn of this.listeners) fn();
	}

	reindex(): void {
		this.model = buildModel(this.adapter.listNotes());
		this.emit();
	}

	private folder(sub: string): string {
		return `${this.rootFolder()}/${sub}`;
	}

	async createClient(input: ClientInput, body = ''): Promise<string> {
		const path = await this.adapter.createNote(
			this.folder('Clients'),
			sanitizeFileName(input.name),
			clientFrontmatter(input),
			body,
		);
		this.reindex();
		return path;
	}

	/** Append an interaction (and optional next-action task) to a note's body. */
	async logInteraction(targetPath: string, entry: InteractionEntry, nextAction = ''): Promise<void> {
		await this.adapter.editBody(targetPath, (body) => appendInteraction(body, entry));
		if (nextAction.trim()) {
			await this.adapter.editBody(targetPath, (body) => appendTask(body, nextAction.trim()));
		}
		this.reindex();
	}

	/** Append a checkbox task to a note's body. */
	async addTask(targetPath: string, text: string): Promise<void> {
		await this.adapter.editBody(targetPath, (body) => appendTask(body, text));
		this.reindex();
	}

	async toggleTask(task: Task, done: boolean): Promise<void> {
		await this.adapter.editBody(task.path, (body) => setTaskDone(body, task.index, done));
		this.reindex();
	}

	async updateClient(path: string, patch: Record<string, unknown>): Promise<void> {
		await this.adapter.updateFrontmatter(path, patch);
		this.reindex();
	}

	async createProject(input: ProjectInput, body = ''): Promise<string> {
		const path = await this.adapter.createNote(
			this.folder('Projects'),
			sanitizeFileName(input.name),
			projectFrontmatter(input),
			body,
		);
		this.reindex();
		return path;
	}

	async updateProject(path: string, patch: Record<string, unknown>): Promise<void> {
		await this.adapter.updateFrontmatter(path, patch);
		this.reindex();
	}

	async updateInteraction(
		path: string,
		patch: Record<string, unknown>,
	): Promise<void> {
		await this.adapter.updateFrontmatter(path, patch);
		this.reindex();
	}

	async deleteProject(project: Project): Promise<void> {
		await this.adapter.deleteNote(project.path);
		this.reindex();
	}

	async deleteNote(path: string): Promise<void> {
		await this.adapter.deleteNote(path);
		this.reindex();
	}

	async createDeal(input: DealInput, body = ''): Promise<string> {
		const path = await this.adapter.createNote(
			this.folder('Deals'),
			sanitizeFileName(input.name),
			dealFrontmatter(input),
			body,
		);
		this.reindex();
		return path;
	}

	async updateDeal(path: string, patch: Record<string, unknown>): Promise<void> {
		await this.adapter.updateFrontmatter(path, patch);
		this.reindex();
	}

	async setDealStage(path: string, stage: DealStage): Promise<void> {
		await this.adapter.updateFrontmatter(path, { stage });
		this.reindex();
	}

	async deleteDeal(deal: Deal): Promise<void> {
		await this.adapter.deleteNote(deal.path);
		this.reindex();
	}

	async convertDealToProject(deal: Deal, input: ProjectInput): Promise<string> {
		const path = await this.adapter.createNote(
			this.folder('Projects'),
			sanitizeFileName(input.name),
			projectFrontmatter({ ...input, dealName: deal.name, clientName: deal.client }),
			'',
		);
		await this.adapter.updateFrontmatter(deal.path, { stage: 'won' });
		this.reindex();
		return path;
	}

	async deleteClient(client: Client): Promise<void> {
		const targets = [
			client.path,
			...client.projects.map((p) => p.path),
			...client.deals.map((d) => d.path),
		];
		for (const path of targets) await this.adapter.deleteNote(path);
		this.reindex();
	}

	async openNote(path: string): Promise<void> {
		await this.adapter.openNote(path);
	}

	/** Install the AI agent guide and entity templates into <root>/_docs. Returns the guide path. */
	async installAgentDocs(): Promise<string> {
		const docs = agentDocs(this.rootFolder());
		for (const doc of docs) await this.adapter.writeDoc(doc.path, doc.content);
		return docs[0]!.path;
	}

	/**
	 * One-time migration: turn legacy client sales fields (status/value/service/…)
	 * into Deal notes, then strip those fields from the client. Idempotent: a client
	 * that already has a deal is skipped. Pass { dryRun: true } to preview counts.
	 */
	async migrateClientsToDeals(opts: { dryRun?: boolean } = {}): Promise<MigrationSummary> {
		const notes = this.adapter.listNotes();
		const legacyClients = notes.filter(
			(n) => asString(n.frontmatter.crm) === 'client' && 'status' in n.frontmatter,
		);
		const clientsWithDeals = new Set(
			notes
				.filter((n) => asString(n.frontmatter.crm) === 'deal')
				.map((n) => {
					const c = n.frontmatter.client;
					return typeof c === 'string' ? c.replace(/^\[\[|\]\]$/g, '').split('|')[0] : '';
				}),
		);

		const created: string[] = [];
		const skipped: string[] = [];
		for (const note of legacyClients) {
			const name = noteBasename(note.path);
			if (clientsWithDeals.has(name)) {
				skipped.push(name);
				continue;
			}
			if (!opts.dryRun) {
				const fm = note.frontmatter;
				const service = asString(fm.service);
				await this.adapter.createNote(
					this.folder('Deals'),
					sanitizeFileName(`${name} - ${service || 'Deal'}`),
					dealFrontmatter({
						name,
						clientName: name,
						stage: legacyStatusToStage(asString(fm.status)),
						value: asNumber(fm.value),
						currency: asString(fm.currency) || 'USD',
						service,
						source: asString(fm.leadSource),
						nextFollowUp: asString(fm.nextFollowUp),
						followUpNote: asString(fm.followUpNote),
					}),
					'',
				);
				await this.adapter.removeFrontmatterKeys(note.path, LEGACY_SALES_KEYS);
			}
			created.push(name);
		}
		if (!opts.dryRun) this.reindex();
		return { created, skipped };
	}
}
