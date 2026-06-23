import { buildModel, emptyModel, type NoteRecord } from './model';
import {
	clientFrontmatter,
	interactionFrontmatter,
	projectFrontmatter,
	taskFrontmatter,
	type ClientInput,
	type InteractionInput,
	type ProjectInput,
	type TaskInput,
} from './frontmatter';
import type { Client, CrmModel, ClientStatus, Project } from './types';

export interface VaultAdapter {
	listNotes(): NoteRecord[];
	createNote(
		folder: string,
		name: string,
		frontmatter: Record<string, unknown>,
		body: string,
	): Promise<string>;
	updateFrontmatter(path: string, patch: Record<string, unknown>): Promise<void>;
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

	async logInteraction(input: InteractionInput, summary: string): Promise<string> {
		const name = sanitizeFileName(`${input.date} ${input.clientName} - ${input.title}`);
		const path = await this.adapter.createNote(
			this.folder('Interactions'),
			name,
			interactionFrontmatter(input),
			summary,
		);
		this.reindex();
		return path;
	}

	async createTask(description: string, input: TaskInput): Promise<string> {
		const path = await this.adapter.createNote(
			this.folder('Tasks'),
			sanitizeFileName(description),
			taskFrontmatter(input),
			description,
		);
		this.reindex();
		return path;
	}

	async toggleTask(path: string, done: boolean): Promise<void> {
		await this.adapter.updateFrontmatter(path, { done });
		this.reindex();
	}

	async updateClient(path: string, patch: Record<string, unknown>): Promise<void> {
		await this.adapter.updateFrontmatter(path, patch);
		this.reindex();
	}

	async setClientStatus(path: string, status: ClientStatus): Promise<void> {
		await this.adapter.updateFrontmatter(path, { status });
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
		const tasks = this.model.tasks.filter((t) => t.project === project.name);
		await this.adapter.deleteNote(project.path);
		for (const task of tasks) await this.adapter.deleteNote(task.path);
		this.reindex();
	}

	async deleteNote(path: string): Promise<void> {
		await this.adapter.deleteNote(path);
		this.reindex();
	}

	async deleteClient(client: Client): Promise<void> {
		const targets = [
			client.path,
			...client.projects.map((p) => p.path),
			...client.interactions.map((i) => i.path),
			...client.tasks.map((t) => t.path),
		];
		for (const path of targets) await this.adapter.deleteNote(path);
		this.reindex();
	}

	async openNote(path: string): Promise<void> {
		await this.adapter.openNote(path);
	}
}
