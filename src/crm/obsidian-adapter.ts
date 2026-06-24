import { App, TFile, TFolder, normalizePath } from 'obsidian';
import type { VaultAdapter } from './store';
import type { NoteRecord } from './model';

export class ObsidianVaultAdapter implements VaultAdapter {
	private cache: NoteRecord[] = [];

	constructor(
		private app: App,
		private rootFolder: () => string,
	) {}

	private root(): string {
		return normalizePath(this.rootFolder());
	}

	listNotes(): NoteRecord[] {
		return this.cache;
	}

	async refresh(): Promise<NoteRecord[]> {
		const root = this.root();
		const prefix = root + '/';
		const records: NoteRecord[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (file.path !== root && !file.path.startsWith(prefix)) continue;
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm || typeof fm.crm !== 'string') continue;
			const raw = await this.app.vault.cachedRead(file);
			records.push({ path: file.path, frontmatter: { ...fm }, body: stripFrontmatter(raw) });
		}
		this.cache = records;
		return records;
	}

	private async ensureFolder(path: string): Promise<void> {
		const parts = normalizePath(path).split('/');
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (!existing) {
				await this.app.vault.createFolder(current);
			} else if (!(existing instanceof TFolder)) {
				throw new Error(`Path ${current} exists and is not a folder`);
			}
		}
	}

	private uniquePath(folder: string, name: string): string {
		let candidate = normalizePath(`${folder}/${name}.md`);
		let i = 2;
		while (this.app.vault.getAbstractFileByPath(candidate)) {
			candidate = normalizePath(`${folder}/${name} ${i}.md`);
			i++;
		}
		return candidate;
	}

	async createNote(
		folder: string,
		name: string,
		frontmatter: Record<string, unknown>,
		body: string,
	): Promise<string> {
		await this.ensureFolder(folder);
		const path = this.uniquePath(folder, name);
		const file = await this.app.vault.create(path, body ? `${body}\n` : '');
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			Object.assign(fm, frontmatter);
		});
		return file.path;
	}

	async updateFrontmatter(path: string, patch: Record<string, unknown>): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
		if (!(file instanceof TFile)) return;
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			Object.assign(fm, patch);
		});
	}

	async editBody(path: string, transform: (body: string) => string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
		if (!(file instanceof TFile)) return;
		await this.app.vault.process(file, (data) => {
			const { frontmatter, body } = splitFrontmatterBlock(data);
			const next = transform(body);
			return frontmatter ? `${frontmatter}\n${next}` : next;
		});
	}

	async removeFrontmatterKeys(path: string, keys: string[]): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
		if (!(file instanceof TFile)) return;
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			for (const key of keys) delete fm[key];
		});
	}

	async deleteNote(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
		if (file instanceof TFile) await this.app.fileManager.trashFile(file);
	}

	async openNote(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
		if (file instanceof TFile) {
			await this.app.workspace.getLeaf('tab').openFile(file);
		}
	}
}

function stripFrontmatter(raw: string): string {
	return splitFrontmatterBlock(raw).body;
}

// Split a note into its frontmatter block (including the --- fences) and the body.
function splitFrontmatterBlock(raw: string): { frontmatter: string; body: string } {
	if (raw.startsWith('---')) {
		const end = raw.indexOf('\n---', 3);
		if (end !== -1) {
			const after = raw.indexOf('\n', end + 1);
			if (after !== -1) {
				return { frontmatter: raw.slice(0, after), body: raw.slice(after + 1) };
			}
			return { frontmatter: raw, body: '' };
		}
	}
	return { frontmatter: '', body: raw };
}
