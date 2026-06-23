# Obsidian CRM Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Svelte plugin template into an Obsidian CRM whose Dashboard, Clients list, and Client detail read from and write to markdown notes in a chosen vault folder, fully following the installed Obsidian theme.

**Architecture:** One `ItemView` mounts a Svelte 5 app with a store-driven router. A plain-TS `CrmStore` indexes markdown notes (clients, projects, interactions, tasks) through a `VaultAdapter` interface and exposes a reactive model via subscribe/emit. The Obsidian adapter wraps `app.vault` + `metadataCache` + `fileManager.processFrontMatter`; tests use a fake adapter so all indexing and write logic is unit-tested without the Obsidian runtime.

**Tech Stack:** TypeScript (strict), Svelte 5 (runes), Tailwind v4 (tokens mapped to Obsidian theme), esbuild, bun (install + build + test runner via `bun:test`).

## Global Constraints

- Build and install with **bun**: `bun install`, `bun run dev`, `bun run build`, `bun test`. (Overrides the npm note in AGENTS.md per user instruction.)
- All domain data lives in markdown notes under one user-chosen root folder. Nothing domain-related is stored in plugin JSON except the root folder path and default currency.
- All color comes from Obsidian theme variables via the existing `styles.css` token map. No hardcoded palette except the small status-pill hue set. No Google fonts; use the Obsidian UI font.
- `main.ts` stays lifecycle-only; feature logic lives in separate modules. Register all listeners/views with `this.register*` for clean unload.
- TypeScript `strict` + `noUncheckedIndexedAccess` are on; code must satisfy them.
- Commit after each task. Commit messages must NOT include a Claude co-author line. Do NOT push.
- Note types use a `crm:` frontmatter discriminator: `client | project | interaction | task`.
- Client status enum: `lead | proposal | negotiating | active | onhold | completed | lost`. Project status enum: `discovery | development | review | completed | cancelled`. Interaction type enum: `call | meeting | email | followup | note`.

---

## File Structure

- `manifest.json` — rebrand id/name/description (modify)
- `package.json` — bun scripts + `test` script (modify)
- `tsconfig.json` — exclude `*.test.ts` from tsc (modify)
- `src/main.ts` — lifecycle: settings, register view/ribbon/command/settings (rewrite)
- `src/settings.ts` — `CrmSettings` (rootFolder, defaultCurrency) + settings tab (rewrite)
- `src/crm/types.ts` — domain types + enums + helpers
- `src/crm/frontmatter.ts` — wikilink + path + input→frontmatter mapping (pure)
- `src/crm/model.ts` — `buildModel` pure indexer + `emptyModel`
- `src/crm/store.ts` — `VaultAdapter` interface + `CrmStore` (subscribe/emit + writes)
- `src/crm/obsidian-adapter.ts` — `ObsidianVaultAdapter` implementing `VaultAdapter`
- `src/crm/*.test.ts` — `bun:test` unit tests
- `src/ui/CrmView.ts` — ItemView host (replaces ExampleView.ts)
- `src/ui/context.ts` — Svelte context keys + getters
- `src/ui/App.svelte` — router shell + top nav + search
- `src/ui/routes/{Dashboard,Clients,ClientDetail}.svelte`
- `src/ui/modals/{NewClient,LogInteraction,DeleteConfirm}.svelte` + `src/ui/modals/host.ts`
- `src/ui/components/{StatusPill,Card,Field,TextField,SelectField,Segmented}.svelte`

Delete: `src/ui/ExampleView.ts` (replaced by `CrmView.ts`).

---

## Task 1: Rebrand, bun scripts, settings

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Rewrite: `src/settings.ts`

**Interfaces:**
- Produces: `CrmSettings { rootFolder: string; defaultCurrency: string }`, `DEFAULT_SETTINGS`, `CrmSettingTab`.

- [ ] **Step 1: Rebrand manifest**

Set in `manifest.json`:
```json
{
	"id": "obsidian-crm-plugin",
	"name": "CRM",
	"version": "1.0.0",
	"minAppVersion": "1.7.2",
	"description": "A client and project CRM that stores everything as markdown notes in your vault and follows your theme.",
	"author": "Abdulkader Safi",
	"authorUrl": "https://abdulkadersafi.com",
	"fundingUrl": "https://ko-fi.com/abdulkadersafi",
	"isDesktopOnly": false
}
```

- [ ] **Step 2: Add bun test script and keep build scripts**

In `package.json`, set the `scripts` block to:
```json
	"scripts": {
		"dev": "run-p dev:js dev:css",
		"dev:js": "node esbuild.config.mjs",
		"dev:css": "tailwindcss -i src/styles.css -o styles.css --watch",
		"build": "tsc -noEmit -skipLibCheck && run-s build:css build:js",
		"build:js": "node esbuild.config.mjs production",
		"build:css": "tailwindcss -i src/styles.css -o styles.css --minify",
		"test": "bun test",
		"version": "node version-bump.mjs && git add manifest.json versions.json",
		"lint": "eslint ."
	},
```

- [ ] **Step 3: Exclude test files from tsc**

In `tsconfig.json`, add a top-level key after `"include"`:
```json
	"include": ["src/**/*.ts"],
	"exclude": ["src/**/*.test.ts"]
```
(Replace the existing `"include"` line with these two lines, keeping it valid JSON.)

- [ ] **Step 4: Rewrite settings**

Replace `src/settings.ts` with:
```ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import type CrmPlugin from './main';

export interface CrmSettings {
	rootFolder: string;
	defaultCurrency: string;
}

export const DEFAULT_SETTINGS: CrmSettings = {
	rootFolder: 'CRM',
	defaultCurrency: 'USD',
};

export class CrmSettingTab extends PluginSettingTab {
	plugin: CrmPlugin;

	constructor(app: App, plugin: CrmPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('CRM folder')
			.setDesc('Folder where clients, projects, interactions, and tasks are stored.')
			.addText((text) =>
				text
					.setPlaceholder('CRM')
					.setValue(this.plugin.settings.rootFolder)
					.onChange(async (value) => {
						this.plugin.settings.rootFolder = value.trim() || 'CRM';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Default currency')
			.setDesc('Currency code applied to new clients and projects.')
			.addText((text) =>
				text
					.setPlaceholder('USD')
					.setValue(this.plugin.settings.defaultCurrency)
					.onChange(async (value) => {
						this.plugin.settings.defaultCurrency = value.trim() || 'USD';
						await this.plugin.saveSettings();
					}),
			);
	}
}
```

- [ ] **Step 5: Commit** (note: `src/main.ts` still imports the old settings names; it is rewritten in Task 6. This task does not need to compile on its own — it is the rebrand/config foundation. Do not run the build yet.)

```bash
git add manifest.json package.json tsconfig.json src/settings.ts
git commit -m "Rebrand to CRM plugin, add bun test script, CRM settings"
```

---

## Task 2: Domain types and frontmatter helpers (TDD)

**Files:**
- Create: `src/crm/types.ts`
- Create: `src/crm/frontmatter.ts`
- Create: `src/crm/frontmatter.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `type ClientStatus`, `type ProjectStatus`, `type InteractionType`
  - `CLIENT_STATUSES: ClientStatus[]`, `PROJECT_STATUSES: ProjectStatus[]`, `INTERACTION_TYPES: InteractionType[]`
  - `interface Client { path; name; status; company; industry; country; region; service; value; currency; leadSource; email; phone; website; contact; pitchAs; nextFollowUp; followUpNote; interactions: Interaction[]; tasks: Task[]; projects: Project[] }`
  - `interface Project { path; name; client; status; progress; budget; currency; startDate; dueDate }`
  - `interface Interaction { path; name; client; project; type; medium; date; duration; title; nextAction; summary }`
  - `interface Task { path; name; client; project; done; due; description }`
- Produces (`frontmatter.ts`):
  - `parseWikilink(value: unknown): string | null`
  - `toWikilink(name: string): string`
  - `noteBasename(path: string): string`
  - `asString(value: unknown): string`
  - `asNumber(value: unknown): number`
  - `asBool(value: unknown): boolean`
  - `clientFrontmatter(input: ClientInput): Record<string, unknown>` and `type ClientInput`
  - `interactionFrontmatter(input: InteractionInput)` and `type InteractionInput`
  - `taskFrontmatter(input: TaskInput)` and `type TaskInput`

- [ ] **Step 1: Write `src/crm/types.ts`**

```ts
export type ClientStatus =
	| 'lead'
	| 'proposal'
	| 'negotiating'
	| 'active'
	| 'onhold'
	| 'completed'
	| 'lost';

export type ProjectStatus =
	| 'discovery'
	| 'development'
	| 'review'
	| 'completed'
	| 'cancelled';

export type InteractionType = 'call' | 'meeting' | 'email' | 'followup' | 'note';

export const CLIENT_STATUSES: ClientStatus[] = [
	'lead',
	'proposal',
	'negotiating',
	'active',
	'onhold',
	'completed',
	'lost',
];

export const PROJECT_STATUSES: ProjectStatus[] = [
	'discovery',
	'development',
	'review',
	'completed',
	'cancelled',
];

export const INTERACTION_TYPES: InteractionType[] = [
	'call',
	'meeting',
	'email',
	'followup',
	'note',
];

export const STATUS_LABELS: Record<ClientStatus, string> = {
	lead: 'Lead',
	proposal: 'Proposal',
	negotiating: 'Negotiating',
	active: 'Active',
	onhold: 'On hold',
	completed: 'Completed',
	lost: 'Lost',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
	discovery: 'Discovery',
	development: 'Development',
	review: 'Review',
	completed: 'Completed',
	cancelled: 'Cancelled',
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
	call: 'Call',
	meeting: 'Meeting',
	email: 'Email',
	followup: 'Follow-up',
	note: 'Note',
};

export interface Interaction {
	path: string;
	name: string;
	client: string | null;
	project: string | null;
	type: InteractionType;
	medium: string;
	date: string;
	duration: number;
	title: string;
	nextAction: string;
	summary: string;
}

export interface Task {
	path: string;
	name: string;
	client: string | null;
	project: string | null;
	done: boolean;
	due: string;
	description: string;
}

export interface Project {
	path: string;
	name: string;
	client: string | null;
	status: ProjectStatus;
	progress: number;
	budget: number;
	currency: string;
	startDate: string;
	dueDate: string;
}

export interface Client {
	path: string;
	name: string;
	status: ClientStatus;
	company: string;
	industry: string;
	country: string;
	region: string;
	service: string;
	value: number;
	currency: string;
	leadSource: string;
	email: string;
	phone: string;
	website: string;
	contact: string;
	pitchAs: string;
	nextFollowUp: string;
	followUpNote: string;
	interactions: Interaction[];
	tasks: Task[];
	projects: Project[];
}

export interface CrmModel {
	clients: Client[];
	projects: Project[];
	interactions: Interaction[];
	tasks: Task[];
}
```

- [ ] **Step 2: Write the failing test `src/crm/frontmatter.test.ts`**

```ts
import { test, expect, describe } from 'bun:test';
import {
	parseWikilink,
	toWikilink,
	noteBasename,
	asNumber,
	asBool,
	clientFrontmatter,
} from './frontmatter';

describe('parseWikilink', () => {
	test('extracts target from a wikilink', () => {
		expect(parseWikilink('[[CoolPeak AC]]')).toBe('CoolPeak AC');
	});
	test('strips an alias', () => {
		expect(parseWikilink('[[CoolPeak AC|Cool]]')).toBe('CoolPeak AC');
	});
	test('returns null for empty or missing', () => {
		expect(parseWikilink('')).toBeNull();
		expect(parseWikilink(undefined)).toBeNull();
		expect(parseWikilink(null)).toBeNull();
	});
	test('accepts a bare name', () => {
		expect(parseWikilink('CoolPeak AC')).toBe('CoolPeak AC');
	});
});

describe('toWikilink', () => {
	test('wraps a name', () => {
		expect(toWikilink('CoolPeak AC')).toBe('[[CoolPeak AC]]');
	});
});

describe('noteBasename', () => {
	test('strips folders and extension', () => {
		expect(noteBasename('CRM/Clients/CoolPeak AC.md')).toBe('CoolPeak AC');
	});
});

describe('coercion', () => {
	test('asNumber parses numbers and strings, defaults 0', () => {
		expect(asNumber(1500)).toBe(1500);
		expect(asNumber('1500')).toBe(1500);
		expect(asNumber(undefined)).toBe(0);
		expect(asNumber('abc')).toBe(0);
	});
	test('asBool reads booleans and strings', () => {
		expect(asBool(true)).toBe(true);
		expect(asBool('true')).toBe(true);
		expect(asBool(undefined)).toBe(false);
	});
});

describe('clientFrontmatter', () => {
	test('builds frontmatter with crm discriminator and defaults', () => {
		const fm = clientFrontmatter({
			name: 'CoolPeak AC',
			status: 'lead',
			value: 1500,
			currency: 'KWD',
		});
		expect(fm.crm).toBe('client');
		expect(fm.status).toBe('lead');
		expect(fm.value).toBe(1500);
		expect(fm.currency).toBe('KWD');
		expect(fm.company).toBe('');
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test src/crm/frontmatter.test.ts`
Expected: FAIL — cannot find module `./frontmatter`.

- [ ] **Step 4: Write `src/crm/frontmatter.ts`**

```ts
import type { ClientStatus, InteractionType } from './types';

export function parseWikilink(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const match = trimmed.match(/^\[\[([^\]]+)\]\]$/);
	const inner = match ? match[1] : trimmed;
	const target = inner.split('|')[0]?.trim() ?? '';
	return target || null;
}

export function toWikilink(name: string): string {
	return `[[${name}]]`;
}

export function noteBasename(path: string): string {
	const file = path.split('/').pop() ?? path;
	return file.replace(/\.md$/i, '');
}

export function asString(value: unknown): string {
	if (value === undefined || value === null) return '';
	return String(value);
}

export function asNumber(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const n = Number(value);
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

export function asBool(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') return value.toLowerCase() === 'true';
	return false;
}

export interface ClientInput {
	name: string;
	status: ClientStatus;
	company?: string;
	industry?: string;
	country?: string;
	region?: string;
	service?: string;
	value?: number;
	currency: string;
	leadSource?: string;
	email?: string;
	phone?: string;
	website?: string;
	contact?: string;
	pitchAs?: string;
	nextFollowUp?: string;
	followUpNote?: string;
}

export function clientFrontmatter(input: ClientInput): Record<string, unknown> {
	return {
		crm: 'client',
		status: input.status,
		company: input.company ?? '',
		industry: input.industry ?? '',
		country: input.country ?? '',
		region: input.region ?? '',
		service: input.service ?? '',
		value: input.value ?? 0,
		currency: input.currency,
		leadSource: input.leadSource ?? '',
		email: input.email ?? '',
		phone: input.phone ?? '',
		website: input.website ?? '',
		contact: input.contact ?? '',
		pitchAs: input.pitchAs ?? '',
		nextFollowUp: input.nextFollowUp ?? '',
		followUpNote: input.followUpNote ?? '',
	};
}

export interface InteractionInput {
	clientName: string;
	projectName?: string | null;
	type: InteractionType;
	medium?: string;
	date: string;
	duration?: number;
	title: string;
	nextAction?: string;
}

export function interactionFrontmatter(
	input: InteractionInput,
): Record<string, unknown> {
	const fm: Record<string, unknown> = {
		crm: 'interaction',
		client: toWikilink(input.clientName),
		type: input.type,
		medium: input.medium ?? '',
		date: input.date,
		duration: input.duration ?? 0,
		title: input.title,
		nextAction: input.nextAction ?? '',
	};
	if (input.projectName) fm.project = toWikilink(input.projectName);
	return fm;
}

export interface TaskInput {
	clientName?: string | null;
	projectName?: string | null;
	done?: boolean;
	due?: string;
}

export function taskFrontmatter(input: TaskInput): Record<string, unknown> {
	const fm: Record<string, unknown> = {
		crm: 'task',
		done: input.done ?? false,
		due: input.due ?? '',
	};
	if (input.clientName) fm.client = toWikilink(input.clientName);
	if (input.projectName) fm.project = toWikilink(input.projectName);
	return fm;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test src/crm/frontmatter.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add src/crm/types.ts src/crm/frontmatter.ts src/crm/frontmatter.test.ts
git commit -m "Add CRM domain types and frontmatter helpers"
```

---

## Task 3: Model indexer (TDD)

**Files:**
- Create: `src/crm/model.ts`
- Create: `src/crm/model.test.ts`

**Interfaces:**
- Consumes: `types.ts` (`Client`, `Project`, …, `CrmModel`), `frontmatter.ts` (`parseWikilink`, `noteBasename`, `asString`, `asNumber`, `asBool`).
- Produces:
  - `interface NoteRecord { path: string; frontmatter: Record<string, unknown>; body: string }`
  - `emptyModel(): CrmModel`
  - `buildModel(notes: NoteRecord[]): CrmModel`

`buildModel` reads each note's `crm` field, builds typed records (body becomes `summary` for interactions and `description` for tasks), then attaches each interaction/task/project to its client by matching `parseWikilink(client)` against the client note's basename.

- [ ] **Step 1: Write the failing test `src/crm/model.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/crm/model.test.ts`
Expected: FAIL — cannot find module `./model`.

- [ ] **Step 3: Write `src/crm/model.ts`**

```ts
import {
	CLIENT_STATUSES,
	PROJECT_STATUSES,
	INTERACTION_TYPES,
	type Client,
	type Project,
	type Interaction,
	type Task,
	type ClientStatus,
	type ProjectStatus,
	type InteractionType,
	type CrmModel,
} from './types';
import { parseWikilink, noteBasename, asString, asNumber, asBool } from './frontmatter';

export interface NoteRecord {
	path: string;
	frontmatter: Record<string, unknown>;
	body: string;
}

export function emptyModel(): CrmModel {
	return { clients: [], projects: [], interactions: [], tasks: [] };
}

function clientStatus(value: unknown): ClientStatus {
	const v = asString(value) as ClientStatus;
	return CLIENT_STATUSES.includes(v) ? v : 'lead';
}

function projectStatus(value: unknown): ProjectStatus {
	const v = asString(value) as ProjectStatus;
	return PROJECT_STATUSES.includes(v) ? v : 'discovery';
}

function interactionType(value: unknown): InteractionType {
	const v = asString(value) as InteractionType;
	return INTERACTION_TYPES.includes(v) ? v : 'note';
}

function toClient(note: NoteRecord): Client {
	const fm = note.frontmatter;
	return {
		path: note.path,
		name: noteBasename(note.path),
		status: clientStatus(fm.status),
		company: asString(fm.company),
		industry: asString(fm.industry),
		country: asString(fm.country),
		region: asString(fm.region),
		service: asString(fm.service),
		value: asNumber(fm.value),
		currency: asString(fm.currency),
		leadSource: asString(fm.leadSource),
		email: asString(fm.email),
		phone: asString(fm.phone),
		website: asString(fm.website),
		contact: asString(fm.contact),
		pitchAs: asString(fm.pitchAs),
		nextFollowUp: asString(fm.nextFollowUp),
		followUpNote: asString(fm.followUpNote),
		interactions: [],
		tasks: [],
		projects: [],
	};
}

function toProject(note: NoteRecord): Project {
	const fm = note.frontmatter;
	return {
		path: note.path,
		name: noteBasename(note.path),
		client: parseWikilink(fm.client),
		status: projectStatus(fm.status),
		progress: asNumber(fm.progress),
		budget: asNumber(fm.budget),
		currency: asString(fm.currency),
		startDate: asString(fm.startDate),
		dueDate: asString(fm.dueDate),
	};
}

function toInteraction(note: NoteRecord): Interaction {
	const fm = note.frontmatter;
	return {
		path: note.path,
		name: noteBasename(note.path),
		client: parseWikilink(fm.client),
		project: parseWikilink(fm.project),
		type: interactionType(fm.type),
		medium: asString(fm.medium),
		date: asString(fm.date),
		duration: asNumber(fm.duration),
		title: asString(fm.title) || noteBasename(note.path),
		nextAction: asString(fm.nextAction),
		summary: note.body.trim(),
	};
}

function toTask(note: NoteRecord): Task {
	const fm = note.frontmatter;
	return {
		path: note.path,
		name: noteBasename(note.path),
		client: parseWikilink(fm.client),
		project: parseWikilink(fm.project),
		done: asBool(fm.done),
		due: asString(fm.due),
		description: note.body.trim() || noteBasename(note.path),
	};
}

export function buildModel(notes: NoteRecord[]): CrmModel {
	const model = emptyModel();
	for (const note of notes) {
		const kind = asString(note.frontmatter.crm);
		if (kind === 'client') model.clients.push(toClient(note));
		else if (kind === 'project') model.projects.push(toProject(note));
		else if (kind === 'interaction') model.interactions.push(toInteraction(note));
		else if (kind === 'task') model.tasks.push(toTask(note));
	}

	const byName = new Map<string, Client>();
	for (const client of model.clients) byName.set(client.name, client);

	for (const project of model.projects) {
		if (project.client) byName.get(project.client)?.projects.push(project);
	}
	for (const interaction of model.interactions) {
		if (interaction.client) byName.get(interaction.client)?.interactions.push(interaction);
	}
	for (const task of model.tasks) {
		if (task.client) byName.get(task.client)?.tasks.push(task);
	}

	const byDateDesc = (a: { date: string }, b: { date: string }) =>
		b.date.localeCompare(a.date);
	for (const client of model.clients) {
		client.interactions.sort(byDateDesc);
	}
	model.interactions.sort(byDateDesc);
	model.clients.sort((a, b) => a.name.localeCompare(b.name));

	return model;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/crm/model.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/crm/model.ts src/crm/model.test.ts
git commit -m "Add CRM model indexer"
```

---

## Task 4: CrmStore (subscribe/emit + writes, TDD with fake adapter)

**Files:**
- Create: `src/crm/store.ts`
- Create: `src/crm/store.test.ts`

**Interfaces:**
- Consumes: `model.ts` (`buildModel`, `emptyModel`, `NoteRecord`), `frontmatter.ts` (`clientFrontmatter`, `interactionFrontmatter`, `taskFrontmatter`, `ClientInput`, `InteractionInput`, `TaskInput`, `noteBasename`), `types.ts` (`CrmModel`, `Client`).
- Produces:
  - `interface VaultAdapter { listNotes(): NoteRecord[]; createNote(folder, name, frontmatter, body): Promise<string>; updateFrontmatter(path, patch): Promise<void>; deleteNote(path): Promise<void>; openNote(path): Promise<void> }`
  - `class CrmStore` with: `constructor(adapter: VaultAdapter, rootFolder: () => string)`, `getModel(): CrmModel`, `reindex(): void`, `subscribe(fn: () => void): () => void`, `createClient(input: ClientInput, body?: string): Promise<string>`, `logInteraction(input: InteractionInput, summary: string): Promise<string>`, `createTask(description: string, input: TaskInput): Promise<string>`, `toggleTask(path: string, done: boolean): Promise<void>`, `deleteClient(client: Client): Promise<void>`, `openNote(path: string): Promise<void>`.

Folder layout: `<root>/Clients`, `<root>/Projects`, `<root>/Interactions`, `<root>/Tasks`.

- [ ] **Step 1: Write the failing test `src/crm/store.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/crm/store.test.ts`
Expected: FAIL — cannot find module `./store`.

- [ ] **Step 3: Write `src/crm/store.ts`**

```ts
import { buildModel, emptyModel, type NoteRecord } from './model';
import {
	clientFrontmatter,
	interactionFrontmatter,
	taskFrontmatter,
	type ClientInput,
	type InteractionInput,
	type TaskInput,
} from './frontmatter';
import type { Client, CrmModel } from './types';

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
		return () => this.listeners.delete(fn);
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/crm/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `bun test`
Expected: PASS (frontmatter + model + store).

- [ ] **Step 6: Commit**

```bash
git add src/crm/store.ts src/crm/store.test.ts
git commit -m "Add CrmStore with reactive subscribe and note writes"
```

---

## Task 5: Obsidian vault adapter

**Files:**
- Create: `src/crm/obsidian-adapter.ts`

**Interfaces:**
- Consumes: `store.ts` (`VaultAdapter`), `model.ts` (`NoteRecord`).
- Produces: `class ObsidianVaultAdapter implements VaultAdapter` with `constructor(app: App, rootFolder: () => string)`.

This task is verified by the build in Task 11 (it depends on the live Obsidian API; no unit test). It reads notes from `metadataCache`, creates folders/notes, edits frontmatter via `fileManager.processFrontMatter`, and opens notes in a leaf.

- [ ] **Step 1: Write `src/crm/obsidian-adapter.ts`**

```ts
import { App, TFile, TFolder, normalizePath } from 'obsidian';
import type { VaultAdapter } from './store';
import type { NoteRecord } from './model';

export class ObsidianVaultAdapter implements VaultAdapter {
	constructor(
		private app: App,
		private rootFolder: () => string,
	) {}

	private root(): string {
		return normalizePath(this.rootFolder());
	}

	listNotes(): NoteRecord[] {
		const root = this.root();
		const prefix = root + '/';
		const records: NoteRecord[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (file.path !== root && !file.path.startsWith(prefix)) continue;
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm || typeof fm.crm !== 'string') continue;
			records.push({ path: file.path, frontmatter: { ...fm }, body: '' });
		}
		return records;
	}

	async listNotesWithBodies(): Promise<NoteRecord[]> {
		const records = this.listNotes();
		await Promise.all(
			records.map(async (record) => {
				const file = this.app.vault.getAbstractFileByPath(record.path);
				if (file instanceof TFile) {
					const raw = await this.app.vault.cachedRead(file);
					record.body = stripFrontmatter(raw);
				}
			}),
		);
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
	if (raw.startsWith('---')) {
		const end = raw.indexOf('\n---', 3);
		if (end !== -1) {
			const after = raw.indexOf('\n', end + 1);
			return after !== -1 ? raw.slice(after + 1).trim() : '';
		}
	}
	return raw.trim();
}
```

Note: `listNotes()` returns records with empty `body`; the view layer that needs interaction summaries/task descriptions calls `listNotesWithBodies()` during reindex (wired in Task 6). `CrmStore.reindex()` uses `adapter.listNotes()` synchronously, so the adapter caches the last body-loaded records — see Task 6 for how the plugin calls `listNotesWithBodies()` then `reindex()`.

- [ ] **Step 2: Adjust adapter to serve cached bodies to the synchronous `listNotes()`**

Replace the `listNotes()` / `listNotesWithBodies()` pair with a cached approach so `CrmStore.reindex()` (synchronous) sees bodies:

```ts
	private cache: NoteRecord[] = [];

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
```

Delete the old `listNotes()` and `listNotesWithBodies()` bodies. The plugin (Task 6) calls `await adapter.refresh()` then `store.reindex()`.

- [ ] **Step 3: Commit**

```bash
git add src/crm/obsidian-adapter.ts
git commit -m "Add Obsidian vault adapter for the CRM store"
```

---

## Task 6: Plugin lifecycle + CrmView + Svelte context

**Files:**
- Rewrite: `src/main.ts`
- Create: `src/ui/CrmView.ts`
- Delete: `src/ui/ExampleView.ts`
- Create: `src/ui/context.ts`
- Replace: `src/ui/App.svelte` (temporary placeholder; full router in later tasks)

**Interfaces:**
- Consumes: `settings.ts`, `store.ts` (`CrmStore`), `obsidian-adapter.ts` (`ObsidianVaultAdapter`).
- Produces:
  - `CRM_VIEW_TYPE = 'crm-view'`, `class CrmView extends ItemView`.
  - `src/ui/context.ts`: `CRM_CONTEXT` key + `setCrmContext(value)` / `getCrm()` returning `{ store: CrmStore; app: App; openNote(path): void; openModal(component, props): void }`.
  - `class CrmPlugin extends Plugin` with `settings: CrmSettings`, `store: CrmStore`, `adapter: ObsidianVaultAdapter`, `saveSettings()`, `refresh()`, `activateView()`.

- [ ] **Step 1: Create `src/ui/context.ts`**

```ts
import { getContext, setContext } from 'svelte';
import type { App, Component } from 'obsidian';
import type { CrmStore } from '../crm/store';

export interface CrmContext {
	store: CrmStore;
	app: App;
	openNote: (path: string) => void;
	openModal: <P extends Record<string, unknown>>(
		component: new (...args: never[]) => unknown,
		props: P,
	) => void;
}

const KEY = Symbol('crm');

export function setCrmContext(value: CrmContext): void {
	setContext(KEY, value);
}

export function getCrm(): CrmContext {
	return getContext(KEY) as CrmContext;
}
```

(The `Component` import is unused here; remove it. `openModal`'s component type is refined in Task 10 — for now `unknown` is fine since Task 10 owns modal hosting.)

- [ ] **Step 2: Create temporary `src/ui/App.svelte`**

```svelte
<script lang="ts">
	import { getCrm } from './context';

	const crm = getCrm();
	let model = $state(crm.store.getModel());

	$effect(() => {
		const off = crm.store.subscribe(() => {
			model = crm.store.getModel();
		});
		return off;
	});
</script>

<div class="app-root bg-background text-foreground h-full overflow-auto p-6">
	<h1 class="mb-2 text-lg font-semibold">CRM</h1>
	<p class="text-muted-foreground text-sm">
		{model.clients.length} clients indexed.
	</p>
</div>
```

- [ ] **Step 3: Create `src/ui/CrmView.ts`**

```ts
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import App from './App.svelte';
import { setCrmContext } from './context';
import type CrmPlugin from '../main';

export const CRM_VIEW_TYPE = 'crm-view';

export class CrmView extends ItemView {
	private component: ReturnType<typeof mount> | undefined;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: CrmPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return CRM_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'CRM';
	}

	getIcon(): string {
		return 'contact';
	}

	async onOpen(): Promise<void> {
		await this.plugin.refresh();
		this.component = mount(App, {
			target: this.contentEl,
			context: this.buildContext(),
		});
	}

	private buildContext(): Map<unknown, unknown> {
		const map = new Map<unknown, unknown>();
		// setCrmContext uses svelte setContext during component init; instead we
		// pass context via Svelte's mount `context` option using the same Symbol.
		return map;
	}

	async onClose(): Promise<void> {
		if (this.component) {
			void unmount(this.component);
			this.component = undefined;
		}
	}
}
```

This `buildContext` placeholder will not work — Svelte context set via `setContext` must run inside component init. Use the approach in Step 4 instead: a root wrapper that calls `setCrmContext` in its script. Replace `CrmView.onOpen` to mount a `Root.svelte` that receives the context value as a prop and sets it.

- [ ] **Step 4: Replace App mounting with a Root that sets context**

Create `src/ui/Root.svelte`:
```svelte
<script lang="ts">
	import App from './App.svelte';
	import { setCrmContext, type CrmContext } from './context';

	let { ctx }: { ctx: CrmContext } = $props();
	setCrmContext(ctx);
</script>

<App />
```

Rewrite `src/ui/CrmView.ts` `onOpen` and remove `buildContext`:
```ts
	async onOpen(): Promise<void> {
		await this.plugin.refresh();
		const { default: Root } = await import('./Root.svelte');
		this.component = mount(Root, {
			target: this.contentEl,
			props: {
				ctx: {
					store: this.plugin.store,
					app: this.app,
					openNote: (path: string) => void this.plugin.store.openNote(path),
					openModal: () => {},
				},
			},
		});
	}
```
Also update the top import to remove `setCrmContext` and `App` from `CrmView.ts` (they move to `Root.svelte`); keep `import { mount, unmount } from 'svelte'`.

- [ ] **Step 5: Rewrite `src/main.ts`**

```ts
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, CrmSettingTab } from './settings';
import type { CrmSettings } from './settings';
import { CrmView, CRM_VIEW_TYPE } from './ui/CrmView';
import { CrmStore } from './crm/store';
import { ObsidianVaultAdapter } from './crm/obsidian-adapter';

export default class CrmPlugin extends Plugin {
	settings!: CrmSettings;
	adapter!: ObsidianVaultAdapter;
	store!: CrmStore;

	async onload() {
		await this.loadSettings();

		this.adapter = new ObsidianVaultAdapter(this.app, () => this.settings.rootFolder);
		this.store = new CrmStore(this.adapter, () => this.settings.rootFolder);

		this.registerView(CRM_VIEW_TYPE, (leaf) => new CrmView(leaf, this));

		this.addRibbonIcon('contact', 'Open CRM', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-crm',
			name: 'Open CRM',
			callback: () => void this.activateView(),
		});

		this.addSettingTab(new CrmSettingTab(this.app, this));

		this.registerEvent(this.app.vault.on('create', () => this.onVaultChange()));
		this.registerEvent(this.app.vault.on('modify', () => this.onVaultChange()));
		this.registerEvent(this.app.vault.on('delete', () => this.onVaultChange()));
		this.registerEvent(this.app.vault.on('rename', () => this.onVaultChange()));
		this.registerEvent(this.app.metadataCache.on('resolved', () => this.onVaultChange()));
	}

	onunload() {}

	private vaultChangeTimer: number | null = null;

	private onVaultChange(): void {
		if (this.vaultChangeTimer !== null) window.clearTimeout(this.vaultChangeTimer);
		this.vaultChangeTimer = window.setTimeout(() => {
			void this.refresh();
		}, 300);
	}

	async refresh(): Promise<void> {
		await this.adapter.refresh();
		this.store.reindex();
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(CRM_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: CRM_VIEW_TYPE, active: true });
		}
		await workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<CrmSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
```

- [ ] **Step 6: Delete the old example view**

```bash
rm src/ui/ExampleView.ts
```

- [ ] **Step 7: Build to verify it compiles**

Run: `bun run build`
Expected: tsc passes, esbuild writes `main.js`, no errors. If `context.ts` flags the unused `Component` import under strict lint, remove that import line.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Wire CRM plugin lifecycle, view, and Svelte context"
```

---

## Task 7: Shared UI components

**Files:**
- Create: `src/ui/components/StatusPill.svelte`
- Create: `src/ui/components/Card.svelte`
- Create: `src/ui/components/Field.svelte`
- Create: `src/ui/components/TextField.svelte`
- Create: `src/ui/components/SelectField.svelte`
- Create: `src/ui/components/Segmented.svelte`

**Interfaces:**
- Produces reusable components consumed by routes (Tasks 8-9) and modals (Task 10).
  - `StatusPill` props: `{ status: ClientStatus | ProjectStatus; label?: string }`
  - `Card` props: `{ title?: string; class?: string; children: Snippet; actions?: Snippet }`
  - `Field` props: `{ label: string; children: Snippet }`
  - `TextField` props: `{ value: string; placeholder?: string; type?: string }` (bindable `value`)
  - `SelectField` props: `{ value: string; options: { value: string; label: string }[] }` (bindable `value`)
  - `Segmented` props: `{ value: string; options: { value: string; label: string }[] }` (bindable `value`)

- [ ] **Step 1: Create `src/ui/components/StatusPill.svelte`**

Status hues are fixed and tuned to read on light and dark surfaces via alpha-tinted backgrounds.

```svelte
<script lang="ts" module>
	const HUES: Record<string, string> = {
		lead: '#8A8475',
		proposal: '#A9791F',
		negotiating: '#BC5E27',
		active: '#2E7D52',
		onhold: '#5E6E7A',
		completed: '#3C8C6A',
		lost: '#A53F34',
		discovery: '#5E6E7A',
		development: '#BC5E27',
		review: '#A9791F',
		cancelled: '#A53F34',
	};
	const LABELS: Record<string, string> = {
		lead: 'Lead',
		proposal: 'Proposal',
		negotiating: 'Negotiating',
		active: 'Active',
		onhold: 'On hold',
		completed: 'Completed',
		lost: 'Lost',
		discovery: 'Discovery',
		development: 'Development',
		review: 'Review',
		cancelled: 'Cancelled',
	};
</script>

<script lang="ts">
	let { status, label }: { status: string; label?: string } = $props();
	const hue = $derived(HUES[status] ?? '#8A8475');
	const text = $derived(label ?? LABELS[status] ?? status);
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
	style="background-color: {hue}22; color: {hue};"
>
	<span class="size-1.5 rounded-full" style="background-color: {hue};"></span>
	{text}
</span>
```

- [ ] **Step 2: Create `src/ui/components/Card.svelte`**

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../lib/utils';

	let {
		title,
		class: className,
		children,
		actions,
	}: {
		title?: string;
		class?: string;
		children: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<section class={cn('border-border bg-card rounded-lg border p-4', className)}>
	{#if title || actions}
		<header class="mb-3 flex items-center justify-between">
			{#if title}
				<h2 class="text-foreground text-sm font-semibold">{title}</h2>
			{/if}
			{#if actions}{@render actions()}{/if}
		</header>
	{/if}
	{@render children()}
</section>
```

- [ ] **Step 3: Create `src/ui/components/Field.svelte`**

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children }: { label: string; children: Snippet } = $props();
</script>

<label class="flex flex-col gap-1">
	<span class="text-muted-foreground text-xs font-medium">{label}</span>
	{@render children()}
</label>
```

- [ ] **Step 4: Create `src/ui/components/TextField.svelte`**

```svelte
<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		type = 'text',
	}: { value?: string; placeholder?: string; type?: string } = $props();
</script>

<input
	{type}
	{placeholder}
	bind:value
	class="border-input bg-background text-foreground focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
/>
```

- [ ] **Step 5: Create `src/ui/components/SelectField.svelte`**

```svelte
<script lang="ts">
	let {
		value = $bindable(''),
		options,
	}: { value?: string; options: { value: string; label: string }[] } = $props();
</script>

<select
	bind:value
	class="border-input bg-background text-foreground focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
>
	{#each options as opt (opt.value)}
		<option value={opt.value}>{opt.label}</option>
	{/each}
</select>
```

- [ ] **Step 6: Create `src/ui/components/Segmented.svelte`**

```svelte
<script lang="ts">
	let {
		value = $bindable(''),
		options,
	}: { value?: string; options: { value: string; label: string }[] } = $props();
</script>

<div class="border-input inline-flex gap-1 rounded-md border p-1">
	{#each options as opt (opt.value)}
		<button
			type="button"
			class="rounded px-2 py-1 text-xs font-medium transition-colors"
			class:bg-primary={value === opt.value}
			class:text-primary-foreground={value === opt.value}
			class:text-muted-foreground={value !== opt.value}
			onclick={() => (value = opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>
```

- [ ] **Step 7: Build to verify components compile**

Run: `bun run build`
Expected: PASS, `main.js` rebuilt.

- [ ] **Step 8: Commit**

```bash
git add src/ui/components
git commit -m "Add shared theme-aware CRM UI components"
```

---

## Task 8: Router shell, top nav, and Clients list

**Files:**
- Create: `src/ui/router.svelte.ts`
- Replace: `src/ui/App.svelte`
- Create: `src/ui/routes/Clients.svelte`
- Create: `src/ui/routes/Dashboard.svelte` (placeholder filled in Task 9 — minimal here)

**Interfaces:**
- Consumes: `context.ts` (`getCrm`), `components/*`, `crm/types.ts`.
- Produces:
  - `router.svelte.ts`: `type Route = { name: 'dashboard' } | { name: 'clients' } | { name: 'client'; path: string }`, and a `createRouter()` returning `{ get current(): Route; go(route: Route): void }` backed by `$state`.
  - `App.svelte` renders top nav (Dashboard, Clients) + search + "New client" button and switches routes.
  - `Clients.svelte` renders the filterable client table; row click goes to `{ name: 'client', path }`.

- [ ] **Step 1: Create `src/ui/router.svelte.ts`**

```ts
export type Route =
	| { name: 'dashboard' }
	| { name: 'clients' }
	| { name: 'client'; path: string };

export function createRouter() {
	let current = $state<Route>({ name: 'dashboard' });
	return {
		get current() {
			return current;
		},
		go(route: Route) {
			current = route;
		},
	};
}
```

If esbuild-svelte does not transform `.svelte.ts` rune files, fall back to a plain store: replace the body with a `$state`-free version using a subscribe pattern. Verify in Step 7's build; if `$state` is undefined at runtime, convert to:
```ts
import { writable } from 'svelte/store';
export type Route = { name: 'dashboard' } | { name: 'clients' } | { name: 'client'; path: string };
export function createRouter() {
	const store = writable<Route>({ name: 'dashboard' });
	let current: Route = { name: 'dashboard' };
	store.subscribe((r) => (current = r));
	return { store, get current() { return current; }, go(route: Route) { store.set(route); } };
}
```
Prefer the `$state` version; only switch if the build proves runes in `.svelte.ts` are unsupported.

- [ ] **Step 2: Replace `src/ui/App.svelte`**

```svelte
<script lang="ts">
	import { getCrm } from './context';
	import { createRouter, type Route } from './router.svelte';
	import { Button } from './lib/components/ui/button';
	import Clients from './routes/Clients.svelte';
	import Dashboard from './routes/Dashboard.svelte';

	const crm = getCrm();
	let model = $state(crm.store.getModel());
	const router = createRouter();
	let search = $state('');

	$effect(() => {
		const off = crm.store.subscribe(() => {
			model = crm.store.getModel();
		});
		return off;
	});

	const tabs: { name: Route['name']; label: string }[] = [
		{ name: 'dashboard', label: 'Dashboard' },
		{ name: 'clients', label: 'Clients' },
	];
</script>

<div class="app-root bg-background text-foreground flex h-full flex-col overflow-hidden">
	<header class="border-border flex items-center gap-3 border-b px-4 py-2">
		<span class="text-foreground font-semibold">CRM</span>
		<nav class="flex items-center gap-1">
			{#each tabs as tab (tab.name)}
				<button
					class="rounded px-3 py-1 text-sm transition-colors"
					class:bg-secondary={router.current.name === tab.name}
					class:text-foreground={router.current.name === tab.name}
					class:text-muted-foreground={router.current.name !== tab.name}
					onclick={() => router.go({ name: tab.name } as Route)}
				>
					{tab.label}
				</button>
			{/each}
		</nav>
		<div class="ml-auto flex items-center gap-2">
			<input
				bind:value={search}
				placeholder="Search clients"
				class="border-input bg-background h-8 rounded-md border px-3 text-sm outline-none"
			/>
			<Button size="sm" onclick={() => crm.openModal('new-client', {})}>New client</Button>
		</div>
	</header>

	<main class="flex-1 overflow-auto p-4">
		{#if router.current.name === 'dashboard'}
			<Dashboard {model} {router} />
		{:else if router.current.name === 'clients'}
			<Clients {model} {search} {router} />
		{:else if router.current.name === 'client'}
			{@const client = model.clients.find((c) => c.path === router.current.path)}
			{#if client}
				{#await import('./routes/ClientDetail.svelte') then { default: ClientDetail }}
					<ClientDetail {client} {router} />
				{/await}
			{:else}
				<p class="text-muted-foreground text-sm">Client not found.</p>
			{/if}
		{/if}
	</main>
</div>
```

Note: `crm.openModal('new-client', {})` uses a string modal key; Task 10 implements `openModal` with that signature. Until Task 10, `openModal` is a no-op set in `CrmView` — clicking does nothing, which is acceptable for this task's build.

- [ ] **Step 3: Create `src/ui/routes/Dashboard.svelte` (minimal placeholder)**

```svelte
<script lang="ts">
	import type { CrmModel } from '../../crm/types';
	import type { createRouter } from '../router.svelte';

	let { model }: { model: CrmModel; router: ReturnType<typeof createRouter> } = $props();
</script>

<p class="text-muted-foreground text-sm">{model.clients.length} clients. Dashboard coming in the next task.</p>
```

- [ ] **Step 4: Create `src/ui/routes/Clients.svelte`**

```svelte
<script lang="ts">
	import type { CrmModel, Client, ClientStatus } from '../../crm/types';
	import { CLIENT_STATUSES, STATUS_LABELS } from '../../crm/types';
	import type { createRouter } from '../router.svelte';
	import StatusPill from '../components/StatusPill.svelte';

	let {
		model,
		search,
		router,
	}: { model: CrmModel; search: string; router: ReturnType<typeof createRouter> } = $props();

	let filter = $state<ClientStatus | 'all'>('all');

	const filtered = $derived(
		model.clients.filter((c) => {
			const matchesStatus = filter === 'all' || c.status === filter;
			const matchesSearch =
				!search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase());
			return matchesStatus && matchesSearch;
		}),
	);

	function money(c: Client): string {
		if (!c.value) return '—';
		return `${c.value.toLocaleString()} ${c.currency}`;
	}
</script>

<div class="mb-3 flex flex-wrap items-center gap-1">
	<button
		class="rounded px-2 py-1 text-xs"
		class:bg-secondary={filter === 'all'}
		class:text-muted-foreground={filter !== 'all'}
		onclick={() => (filter = 'all')}>All</button
	>
	{#each CLIENT_STATUSES as status (status)}
		<button
			class="rounded px-2 py-1 text-xs"
			class:bg-secondary={filter === status}
			class:text-muted-foreground={filter !== status}
			onclick={() => (filter = status)}>{STATUS_LABELS[status]}</button
		>
	{/each}
</div>

<div class="border-border overflow-hidden rounded-lg border">
	<table class="w-full text-sm">
		<thead class="text-muted-foreground border-border border-b text-left text-xs">
			<tr>
				<th class="px-3 py-2 font-medium">Client</th>
				<th class="px-3 py-2 font-medium">Status</th>
				<th class="px-3 py-2 font-medium">Service</th>
				<th class="px-3 py-2 font-medium">Value</th>
				<th class="px-3 py-2 font-medium">Country</th>
				<th class="px-3 py-2 font-medium">Next follow-up</th>
			</tr>
		</thead>
		<tbody>
			{#each filtered as client (client.path)}
				<tr
					class="border-border hover:bg-accent cursor-pointer border-b last:border-0"
					onclick={() => router.go({ name: 'client', path: client.path })}
				>
					<td class="text-foreground px-3 py-2 font-medium">{client.name}</td>
					<td class="px-3 py-2"><StatusPill status={client.status} /></td>
					<td class="text-muted-foreground px-3 py-2">{client.service || '—'}</td>
					<td class="text-foreground px-3 py-2">{money(client)}</td>
					<td class="text-muted-foreground px-3 py-2">{client.country || '—'}</td>
					<td class="text-muted-foreground px-3 py-2">{client.nextFollowUp || '—'}</td>
				</tr>
			{:else}
				<tr><td class="text-muted-foreground px-3 py-6 text-center" colspan="6">No clients yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
```

- [ ] **Step 5: Build to verify it compiles**

Run: `bun run build`
Expected: PASS. If runes in `.svelte.ts` fail at build, apply the fallback from Step 1 and adjust `App.svelte` to read `router.current` via the store (`$router.store` or a local `$state` updated from `router.store.subscribe`). Re-run until green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add CRM router, top nav, and Clients list"
```

---

## Task 9: Dashboard and Client detail

**Files:**
- Rewrite: `src/ui/routes/Dashboard.svelte`
- Create: `src/ui/routes/ClientDetail.svelte`

**Interfaces:**
- Consumes: `crm/types.ts`, `components/{StatusPill,Card}`, `context.ts`, `router.svelte.ts`.
- Produces: full Dashboard (pipeline summary, follow-ups this week, finance snapshot, recent activity, active projects) and Client detail (header, deal panel, contact panel, interaction history, action items with toggles, linked projects, open-note + log-interaction + delete actions).

- [ ] **Step 1: Rewrite `src/ui/routes/Dashboard.svelte`**

```svelte
<script lang="ts">
	import type { CrmModel, ClientStatus } from '../../crm/types';
	import { CLIENT_STATUSES, STATUS_LABELS } from '../../crm/types';
	import type { createRouter } from '../router.svelte';
	import Card from '../components/Card.svelte';
	import StatusPill from '../components/StatusPill.svelte';

	let { model, router }: { model: CrmModel; router: ReturnType<typeof createRouter> } = $props();

	const pipeline = $derived(
		CLIENT_STATUSES.map((status) => {
			const clients = model.clients.filter((c) => c.status === status);
			const value = clients.reduce((sum, c) => sum + c.value, 0);
			return { status, count: clients.length, value };
		}),
	);

	const wonValue = $derived(
		model.clients.filter((c) => c.status === 'completed').reduce((s, c) => s + c.value, 0),
	);
	const openValue = $derived(
		model.clients
			.filter((c) => !['completed', 'lost'].includes(c.status))
			.reduce((s, c) => s + c.value, 0),
	);

	function weekAhead(dateStr: string): boolean {
		if (!dateStr) return false;
		const date = new Date(dateStr).getTime();
		if (Number.isNaN(date)) return false;
		const now = Date.now();
		return date >= now - 86400000 && date <= now + 7 * 86400000;
	}

	const followUps = $derived(model.clients.filter((c) => weekAhead(c.nextFollowUp)));
	const recent = $derived(model.interactions.slice(0, 8));
	const activeProjects = $derived(
		model.projects.filter((p) => !['completed', 'cancelled'].includes(p.status)),
	);
</script>

<div class="flex flex-col gap-4">
	<Card title="Pipeline">
		<div class="flex flex-wrap gap-4">
			{#each pipeline as item (item.status)}
				<div class="flex flex-col">
					<StatusPill status={item.status} />
					<span class="text-foreground mt-1 text-lg font-semibold">{item.count}</span>
					<span class="text-muted-foreground text-xs">{item.value.toLocaleString()}</span>
				</div>
			{/each}
		</div>
	</Card>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card title="Follow-ups this week">
			{#if followUps.length}
				<ul class="flex flex-col gap-2">
					{#each followUps as client (client.path)}
						<li class="flex items-center justify-between">
							<button
								class="text-foreground text-sm hover:underline"
								onclick={() => router.go({ name: 'client', path: client.path })}
								>{client.name}</button
							>
							<span class="text-muted-foreground text-xs">{client.nextFollowUp}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground text-sm">Nothing due this week.</p>
			{/if}
		</Card>

		<Card title="Finance">
			<div class="flex gap-6">
				<div>
					<p class="text-muted-foreground text-xs">Won</p>
					<p class="text-foreground text-lg font-semibold">{wonValue.toLocaleString()}</p>
				</div>
				<div>
					<p class="text-muted-foreground text-xs">Open pipeline</p>
					<p class="text-foreground text-lg font-semibold">{openValue.toLocaleString()}</p>
				</div>
			</div>
		</Card>
	</div>

	<Card title="Recent activity">
		{#if recent.length}
			<ul class="flex flex-col gap-2">
				{#each recent as it (it.path)}
					<li class="flex items-center justify-between text-sm">
						<span class="text-foreground">{it.title}</span>
						<span class="text-muted-foreground text-xs">{it.client ?? ''} · {it.date}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No interactions logged yet.</p>
		{/if}
	</Card>

	<Card title="Active projects">
		{#if activeProjects.length}
			<ul class="flex flex-col gap-2">
				{#each activeProjects as p (p.path)}
					<li class="flex items-center justify-between text-sm">
						<span class="text-foreground">{p.name}</span>
						<span class="text-muted-foreground flex items-center gap-2 text-xs">
							<StatusPill status={p.status} />
							{p.progress}%
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No active projects.</p>
		{/if}
	</Card>
</div>
```

- [ ] **Step 2: Create `src/ui/routes/ClientDetail.svelte`**

```svelte
<script lang="ts">
	import type { Client } from '../../crm/types';
	import type { createRouter } from '../router.svelte';
	import { getCrm } from '../context';
	import Card from '../components/Card.svelte';
	import StatusPill from '../components/StatusPill.svelte';
	import { Button } from '../lib/components/ui/button';

	let { client, router }: { client: Client; router: ReturnType<typeof createRouter> } = $props();
	const crm = getCrm();

	function money(): string {
		return client.value ? `${client.value.toLocaleString()} ${client.currency}` : '—';
	}

	async function toggle(taskPath: string, done: boolean) {
		await crm.store.toggleTask(taskPath, done);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-start justify-between">
		<div>
			<button class="text-muted-foreground mb-1 text-xs hover:underline" onclick={() => router.go({ name: 'clients' })}>
				← Clients
			</button>
			<div class="flex items-center gap-2">
				<h1 class="text-foreground text-xl font-semibold">{client.name}</h1>
				<StatusPill status={client.status} />
			</div>
			<p class="text-muted-foreground text-sm">{client.company || ''}</p>
		</div>
		<div class="flex gap-2">
			<Button size="sm" variant="secondary" onclick={() => crm.openModal('log-interaction', { clientName: client.name })}>
				Log interaction
			</Button>
			<Button size="sm" variant="outline" onclick={() => crm.openNote(client.path)}>Open note</Button>
			<Button size="sm" variant="destructive" onclick={() => crm.openModal('delete-client', { clientPath: client.path })}>
				Delete
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card title="Deal">
			<dl class="grid grid-cols-2 gap-y-2 text-sm">
				<dt class="text-muted-foreground">Service</dt><dd class="text-foreground">{client.service || '—'}</dd>
				<dt class="text-muted-foreground">Value</dt><dd class="text-foreground">{money()}</dd>
				<dt class="text-muted-foreground">Lead source</dt><dd class="text-foreground">{client.leadSource || '—'}</dd>
				<dt class="text-muted-foreground">Next follow-up</dt><dd class="text-foreground">{client.nextFollowUp || '—'}</dd>
				<dt class="text-muted-foreground">Pitch as</dt><dd class="text-foreground">{client.pitchAs || '—'}</dd>
			</dl>
		</Card>
		<Card title="Contact">
			<dl class="grid grid-cols-2 gap-y-2 text-sm">
				<dt class="text-muted-foreground">Email</dt><dd class="text-foreground">{client.email || '—'}</dd>
				<dt class="text-muted-foreground">Phone</dt><dd class="text-foreground">{client.phone || '—'}</dd>
				<dt class="text-muted-foreground">Website</dt><dd class="text-foreground">{client.website || '—'}</dd>
				<dt class="text-muted-foreground">Primary contact</dt><dd class="text-foreground">{client.contact || '—'}</dd>
				<dt class="text-muted-foreground">Country</dt><dd class="text-foreground">{client.country || '—'}</dd>
			</dl>
		</Card>
	</div>

	<Card title="Interaction history">
		{#if client.interactions.length}
			<ul class="flex flex-col gap-3">
				{#each client.interactions as it (it.path)}
					<li class="border-border border-b pb-2 last:border-0">
						<div class="flex items-center justify-between">
							<span class="text-foreground text-sm font-medium">{it.title}</span>
							<span class="text-muted-foreground text-xs">{it.date}</span>
						</div>
						{#if it.summary}<p class="text-muted-foreground mt-1 text-sm">{it.summary}</p>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No interactions yet.</p>
		{/if}
	</Card>

	<Card title="Action items">
		{#if client.tasks.length}
			<ul class="flex flex-col gap-2">
				{#each client.tasks as task (task.path)}
					<li class="flex items-center gap-2 text-sm">
						<input type="checkbox" checked={task.done} onchange={(e) => toggle(task.path, e.currentTarget.checked)} />
						<span class="text-foreground" class:line-through={task.done}>{task.description}</span>
						{#if task.due}<span class="text-muted-foreground ml-auto text-xs">{task.due}</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No action items.</p>
		{/if}
	</Card>

	<Card title="Projects">
		{#if client.projects.length}
			<ul class="flex flex-col gap-2">
				{#each client.projects as p (p.path)}
					<li class="flex items-center justify-between text-sm">
						<button class="text-foreground hover:underline" onclick={() => crm.openNote(p.path)}>{p.name}</button>
						<span class="text-muted-foreground flex items-center gap-2 text-xs"><StatusPill status={p.status} /> {p.progress}%</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No linked projects.</p>
		{/if}
	</Card>
</div>
```

- [ ] **Step 3: Build to verify it compiles**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add CRM Dashboard and Client detail screens"
```

---

## Task 10: Modals (New Client, Log Interaction, Delete confirm)

**Files:**
- Create: `src/ui/modals/host.ts`
- Create: `src/ui/modals/NewClient.svelte`
- Create: `src/ui/modals/LogInteraction.svelte`
- Create: `src/ui/modals/DeleteConfirm.svelte`
- Modify: `src/ui/CrmView.ts` (implement `openModal`)

**Interfaces:**
- Consumes: `store.ts` (`CrmStore`), `crm/types.ts`, `components/*`, Obsidian `Modal`.
- Produces:
  - `host.ts`: `type ModalKey = 'new-client' | 'log-interaction' | 'delete-client'`, `openCrmModal(app, plugin, key, props)` that constructs an Obsidian `Modal`, mounts the matching Svelte component into `modal.contentEl` with `{ ...props, close: () => modal.close() }`, and unmounts on close.
  - `openModal` in the context now delegates to `openCrmModal`.

- [ ] **Step 1: Create `src/ui/modals/host.ts`**

```ts
import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import type CrmPlugin from '../../main';
import { setCrmContext } from '../context';
import NewClient from './NewClient.svelte';
import LogInteraction from './LogInteraction.svelte';
import DeleteConfirm from './DeleteConfirm.svelte';

export type ModalKey = 'new-client' | 'log-interaction' | 'delete-client';

const COMPONENTS = {
	'new-client': NewClient,
	'log-interaction': LogInteraction,
	'delete-client': DeleteConfirm,
} as const;

export function openCrmModal(
	app: App,
	plugin: CrmPlugin,
	key: ModalKey,
	props: Record<string, unknown>,
): void {
	const modal = new Modal(app);
	modal.contentEl.addClass('app-root');
	let component: ReturnType<typeof mount> | undefined;

	modal.onOpen = () => {
		const Wrapper = COMPONENTS[key];
		component = mount(Wrapper, {
			target: modal.contentEl,
			props: { ...props, close: () => modal.close() },
			context: contextMap(app, plugin),
		});
	};
	modal.onClose = () => {
		if (component) void unmount(component);
		modal.contentEl.empty();
	};
	modal.open();
}

function contextMap(app: App, plugin: CrmPlugin): Map<unknown, unknown> {
	// Reuse the same context the main view provides so modals can read the store.
	// setCrmContext requires component-init scope, so we mount through Root-less
	// components that call getCrm(); instead we provide via Svelte's context map.
	const map = new Map<unknown, unknown>();
	void setCrmContext;
	void app;
	void plugin;
	return map;
}
```

The `contextMap` hack does not work (same constraint as Task 6). Use the Root-wrapper pattern: each modal component receives `store` directly as a prop instead of via context. Simplify: pass `store: plugin.store` and `app` in props. Replace `host.ts` with:

```ts
import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import type CrmPlugin from '../../main';
import NewClient from './NewClient.svelte';
import LogInteraction from './LogInteraction.svelte';
import DeleteConfirm from './DeleteConfirm.svelte';

export type ModalKey = 'new-client' | 'log-interaction' | 'delete-client';

const COMPONENTS = {
	'new-client': NewClient,
	'log-interaction': LogInteraction,
	'delete-client': DeleteConfirm,
} as const;

export function openCrmModal(
	app: App,
	plugin: CrmPlugin,
	key: ModalKey,
	props: Record<string, unknown>,
): void {
	const modal = new Modal(app);
	modal.contentEl.addClass('app-root');
	let component: ReturnType<typeof mount> | undefined;

	modal.onOpen = () => {
		const Wrapper = COMPONENTS[key];
		component = mount(Wrapper, {
			target: modal.contentEl,
			props: { ...props, store: plugin.store, close: () => modal.close() },
		});
	};
	modal.onClose = () => {
		if (component) void unmount(component);
		modal.contentEl.empty();
	};
	modal.open();
}
```

- [ ] **Step 2: Create `src/ui/modals/NewClient.svelte`**

```svelte
<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { CLIENT_STATUSES, STATUS_LABELS, type ClientStatus } from '../../crm/types';
	import Field from '../components/Field.svelte';
	import TextField from '../components/TextField.svelte';
	import SelectField from '../components/SelectField.svelte';
	import { Button } from '../lib/components/ui/button';

	let { store, close }: { store: CrmStore; close: () => void } = $props();

	let name = $state('');
	let company = $state('');
	let industry = $state('');
	let country = $state('');
	let region = $state('');
	let status = $state<ClientStatus>('lead');
	let service = $state('');
	let value = $state('');
	let leadSource = $state('');
	let email = $state('');
	let phone = $state('');
	let website = $state('');
	let contact = $state('');
	let pitchAs = $state('Freelance');
	let nextFollowUp = $state('');
	let followUpNote = $state('');
	let saving = $state(false);

	const statusOptions = CLIENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

	async function save() {
		if (!name.trim() || saving) return;
		saving = true;
		try {
			await store.createClient(
				{
					name: name.trim(),
					status,
					company,
					industry,
					country,
					region,
					service,
					value: Number(value) || 0,
					currency: 'USD',
					leadSource,
					email,
					phone,
					website,
					contact,
					pitchAs,
					nextFollowUp,
					followUpNote,
				},
				followUpNote,
			);
			close();
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<h2 class="text-foreground text-base font-semibold">New client</h2>
	<div class="grid grid-cols-2 gap-3">
		<Field label="Client name"><TextField bind:value={name} placeholder="e.g. CoolPeak AC" /></Field>
		<Field label="Company"><TextField bind:value={company} /></Field>
		<Field label="Industry"><TextField bind:value={industry} /></Field>
		<Field label="Country"><TextField bind:value={country} /></Field>
		<Field label="Region"><TextField bind:value={region} /></Field>
		<Field label="Status"><SelectField bind:value={status} options={statusOptions} /></Field>
		<Field label="Service"><TextField bind:value={service} /></Field>
		<Field label="Estimated value"><TextField bind:value type="number" /></Field>
		<Field label="Lead source"><TextField bind:value={leadSource} /></Field>
		<Field label="Email"><TextField bind:value={email} /></Field>
		<Field label="Phone"><TextField bind:value={phone} /></Field>
		<Field label="Website"><TextField bind:value={website} /></Field>
		<Field label="Primary contact"><TextField bind:value={contact} /></Field>
		<Field label="Pitch as"><TextField bind:value={pitchAs} /></Field>
		<Field label="Next follow-up"><TextField bind:value={nextFollowUp} type="date" /></Field>
	</div>
	<Field label="Follow-up note"><TextField bind:value={followUpNote} /></Field>
	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!name.trim() || saving} onclick={save}>Create client</Button>
	</div>
</div>
```

Note: `<TextField bind:value type="number" />` for estimated value binds the `value` state declared above; rename the local to avoid clash — change `let value = $state('')` references in the estimated-value field to `bind:value={value}` explicitly. Since the prop and variable are both `value`, write `bind:value={value}`.

- [ ] **Step 3: Create `src/ui/modals/LogInteraction.svelte`**

```svelte
<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { INTERACTION_TYPES, INTERACTION_LABELS, type InteractionType } from '../../crm/types';
	import Field from '../components/Field.svelte';
	import TextField from '../components/TextField.svelte';
	import SelectField from '../components/SelectField.svelte';
	import Segmented from '../components/Segmented.svelte';
	import { Button } from '../lib/components/ui/button';

	let {
		store,
		close,
		clientName = '',
	}: { store: CrmStore; close: () => void; clientName?: string } = $props();

	const clients = store.getModel().clients;
	let client = $state(clientName || (clients[0]?.name ?? ''));
	let project = $state('');
	let title = $state('');
	let type = $state<InteractionType>('email');
	let medium = $state('');
	let date = $state(new Date().toISOString().slice(0, 10));
	let duration = $state('');
	let summary = $state('');
	let nextAction = $state('');
	let saving = $state(false);

	const clientOptions = $derived(clients.map((c) => ({ value: c.name, label: c.name })));
	const projectOptions = $derived([
		{ value: '', label: 'None' },
		...(clients.find((c) => c.name === client)?.projects ?? []).map((p) => ({
			value: p.name,
			label: p.name,
		})),
	]);
	const typeOptions = INTERACTION_TYPES.map((t) => ({ value: t, label: INTERACTION_LABELS[t] }));

	async function save() {
		if (!client || !title.trim() || saving) return;
		saving = true;
		try {
			await store.logInteraction(
				{
					clientName: client,
					projectName: project || null,
					type,
					medium,
					date,
					duration: Number(duration) || 0,
					title: title.trim(),
					nextAction,
				},
				summary,
			);
			if (nextAction.trim()) {
				await store.createTask(nextAction.trim(), {
					clientName: client,
					projectName: project || null,
				});
			}
			close();
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<h2 class="text-foreground text-base font-semibold">Log interaction</h2>
	<div class="grid grid-cols-2 gap-3">
		<Field label="Client"><SelectField bind:value={client} options={clientOptions} /></Field>
		<Field label="Project"><SelectField bind:value={project} options={projectOptions} /></Field>
	</div>
	<Field label="Title"><TextField bind:value={title} placeholder="e.g. Follow-up call" /></Field>
	<Field label="Type"><Segmented bind:value={type} options={typeOptions} /></Field>
	<div class="grid grid-cols-3 gap-3">
		<Field label="Medium"><TextField bind:value={medium} /></Field>
		<Field label="Date"><TextField bind:value={date} type="date" /></Field>
		<Field label="Duration (min)"><TextField bind:value={duration} type="number" /></Field>
	</div>
	<Field label="Summary"><TextField bind:value={summary} placeholder="What was discussed?" /></Field>
	<Field label="Next action"><TextField bind:value={nextAction} placeholder="What happens next?" /></Field>
	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!client || !title.trim() || saving} onclick={save}>Log interaction</Button>
	</div>
</div>
```

- [ ] **Step 4: Create `src/ui/modals/DeleteConfirm.svelte`**

```svelte
<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { Button } from '../lib/components/ui/button';

	let {
		store,
		close,
		clientPath,
	}: { store: CrmStore; close: () => void; clientPath: string } = $props();

	const client = store.getModel().clients.find((c) => c.path === clientPath);
	let deleting = $state(false);

	async function confirm() {
		if (!client || deleting) return;
		deleting = true;
		try {
			await store.deleteClient(client);
			close();
		} finally {
			deleting = false;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<h2 class="text-foreground text-base font-semibold">Delete {client?.name ?? 'client'}?</h2>
	<p class="text-muted-foreground text-sm">
		This removes the client note and everything linked to it. This can't be undone.
	</p>
	{#if client}
		<div class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
			{#if client.projects.length}<p>Also deletes {client.projects.length} project(s)</p>{/if}
			{#if client.interactions.length}<p>Also deletes {client.interactions.length} logged interaction(s)</p>{/if}
			{#if client.tasks.length}<p>Also deletes {client.tasks.length} task(s)</p>{/if}
		</div>
	{/if}
	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button variant="destructive" size="sm" disabled={deleting} onclick={confirm}>Delete client</Button>
	</div>
</div>
```

- [ ] **Step 5: Wire `openModal` in `src/ui/CrmView.ts`**

In the `ctx` object passed to `Root`, replace `openModal: () => {}` with:
```ts
				openModal: (key: string, props: Record<string, unknown>) =>
					openCrmModal(this.app, this.plugin, key as ModalKey, props),
```
Add the import at the top of `CrmView.ts`:
```ts
import { openCrmModal, type ModalKey } from './modals/host';
```
And update the `CrmContext.openModal` signature in `context.ts` to:
```ts
	openModal: (key: string, props: Record<string, unknown>) => void;
```

- [ ] **Step 6: Build to verify it compiles**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add CRM modals: new client, log interaction, delete confirm"
```

---

## Task 11: Full build + manual verification in vault

**Files:** none (verification + any fixups).

- [ ] **Step 1: Run the full test suite**

Run: `bun test`
Expected: PASS (frontmatter, model, store).

- [ ] **Step 2: Production build**

Run: `bun run build`
Expected: tsc clean, `main.js` + `styles.css` written, no errors.

- [ ] **Step 3: Lint**

Run: `bun run lint`
Expected: no errors. Fix any reported issues (e.g. unused imports) and rebuild.

- [ ] **Step 4: Manual load in the vault**

The plugin folder already lives at `<Vault>/.obsidian/plugins/obsidian-crm-plugin`. In Obsidian: reload (Cmd/Ctrl+R), enable **CRM** under Settings → Community plugins, set the CRM folder in the plugin settings, then open the CRM via the ribbon contact icon or the "Open CRM" command. Verify:
  - The view renders with theme colors; switch theme/dark mode and confirm it recolors.
  - "New client" creates `<root>/Clients/<name>.md` with frontmatter; the client appears in the list and dashboard counts.
  - Opening a client shows the detail; "Log interaction" creates an `<root>/Interactions/*.md`; it shows in interaction history and recent activity; a next action creates a `<root>/Tasks/*.md`.
  - Toggling an action item updates the task note's `done`.
  - "Delete" removes the client and linked notes after the cascade warning.
  - "Open note" opens the underlying markdown.

- [ ] **Step 5: Commit any fixups**

```bash
git add -A
git commit -m "Phase 1 verification fixups"
```

(If no fixes were needed, skip the commit.)

---

## Self-Review notes

- **Spec coverage:** markdown-note data model (Tasks 2-5), one-folder setting (Task 1), theme-adaptive UI (Tasks 7-10 use tokens + `styles.css`), Dashboard/Clients/Client detail (Tasks 8-9), three modals (Task 10), rebrand + bun (Task 1), reactive store + vault events (Tasks 4, 6). Projects exist as a note type (Tasks 2-3) and render read-only in client detail; full Project screens are Phase 2, out of scope here.
- **Known runtime risk:** Svelte 5 runes in `.svelte.ts` (`router.svelte.ts`) under esbuild-svelte. Task 8 Step 1 + Step 5 carry an explicit fallback to a `svelte/store` writable if the build shows runes are unsupported there.
- **Context-passing risk:** Svelte `setContext` must run during component init. Resolved by the `Root.svelte` wrapper (Task 6) and by passing `store` directly as a prop to modal components (Task 10), avoiding context entirely for modals.
- **Body loading:** `metadataCache.getFileCache` gives frontmatter synchronously, but interaction summaries/task descriptions need file bodies; the adapter's async `refresh()` (Task 5 Step 2) loads bodies before `store.reindex()`, called from the debounced vault-change handler and `onOpen` (Task 6).
