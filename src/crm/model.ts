import {
	PROJECT_STATUSES,
	INTERACTION_TYPES,
	DEAL_STAGES,
	OPEN_DEAL_STAGES,
	type Client,
	type Project,
	type Interaction,
	type Task,
	type Deal,
	type ProjectStatus,
	type InteractionType,
	type DealStage,
	type ClientRelationship,
	type CrmModel,
} from './types';
import { parseWikilink, noteBasename, asString, asNumber, asBool } from './frontmatter';
import { splitBody, type InlineTask, type InlineInteractionRaw } from './body';

export interface NoteRecord {
	path: string;
	frontmatter: Record<string, unknown>;
	body: string;
}

export function emptyModel(): CrmModel {
	return { clients: [], projects: [], interactions: [], tasks: [], deals: [] };
}

function projectStatus(value: unknown): ProjectStatus {
	const v = asString(value) as ProjectStatus;
	return PROJECT_STATUSES.includes(v) ? v : 'discovery';
}

function interactionType(value: unknown): InteractionType {
	const v = asString(value) as InteractionType;
	return INTERACTION_TYPES.includes(v) ? v : 'note';
}

function dealStage(value: unknown): DealStage {
	const v = asString(value) as DealStage;
	return DEAL_STAGES.includes(v) ? v : 'lead';
}

function toStringArray(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => asString(v)).filter(Boolean);
	const s = asString(value).trim();
	return s ? [s] : [];
}

function toMilestones(value: unknown): { title: string; done: boolean }[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((m) => {
			if (m && typeof m === 'object') {
				const rec = m as Record<string, unknown>;
				return { title: asString(rec.title), done: asBool(rec.done) };
			}
			return { title: asString(m), done: false };
		})
		.filter((m) => m.title);
}

function inlineInteraction(
	raw: InlineInteractionRaw,
	parentPath: string,
	client: string | null,
	project: string | null,
): Interaction {
	return {
		path: parentPath,
		name: `${parentPath}#i${raw.index}`,
		client,
		project,
		type: interactionType(raw.type),
		medium: '',
		date: raw.date,
		duration: 0,
		title: raw.title || 'Interaction',
		nextAction: '',
		summary: raw.summary,
		index: raw.index,
	};
}

function inlineTask(
	raw: InlineTask,
	parentPath: string,
	client: string | null,
	project: string | null,
): Task {
	return {
		path: parentPath,
		name: `${parentPath}#t${raw.index}`,
		client,
		project,
		done: raw.done,
		due: '',
		description: raw.text,
		notes: raw.notes,
		inline: true,
		index: raw.index,
	};
}

function toClient(note: NoteRecord): Client {
	const fm = note.frontmatter;
	const name = noteBasename(note.path);
	const parsed = splitBody(note.body);
	return {
		path: note.path,
		name,
		company: asString(fm.company),
		industry: asString(fm.industry),
		country: asString(fm.country),
		region: asString(fm.region),
		currency: asString(fm.currency),
		email: asString(fm.email),
		phone: asString(fm.phone),
		website: asString(fm.website),
		contact: asString(fm.contact),
		pitchAs: asString(fm.pitchAs),
		tags: toStringArray(fm.tags),
		relationship: 'prospect',
		interactions: parsed.interactions.map((r) => inlineInteraction(r, note.path, name, null)),
		tasks: parsed.tasks.map((r) => inlineTask(r, note.path, name, null)),
		projects: [],
		deals: [],
	};
}

function toDeal(note: NoteRecord): Deal {
	const fm = note.frontmatter;
	const client = parseWikilink(fm.client);
	const parsed = splitBody(note.body);
	return {
		path: note.path,
		name: noteBasename(note.path),
		client,
		stage: dealStage(fm.stage),
		value: asNumber(fm.value),
		currency: asString(fm.currency),
		service: asString(fm.service),
		source: asString(fm.source),
		expectedClose: asString(fm.expectedClose),
		nextFollowUp: asString(fm.nextFollowUp),
		followUpNote: asString(fm.followUpNote),
		outcomeReason: asString(fm.outcomeReason),
		opened: asString(fm.opened),
		notes: parsed.notes,
		interactions: parsed.interactions.map((r) => inlineInteraction(r, note.path, client, null)),
	};
}

function toProject(note: NoteRecord): Project {
	const fm = note.frontmatter;
	const name = noteBasename(note.path);
	const client = parseWikilink(fm.client);
	const parsed = splitBody(note.body);
	return {
		path: note.path,
		name,
		client,
		deal: parseWikilink(fm.deal),
		status: projectStatus(fm.status),
		service: asString(fm.service),
		progress: asNumber(fm.progress),
		budget: asNumber(fm.budget),
		currency: asString(fm.currency),
		startDate: asString(fm.startDate),
		dueDate: asString(fm.dueDate),
		paymentTerms: asString(fm.paymentTerms),
		milestones: toMilestones(fm.milestones),
		notes: parsed.notes,
		tasks: parsed.tasks.map((r) => inlineTask(r, note.path, client, name)),
		interactions: parsed.interactions.map((r) => inlineInteraction(r, note.path, client, name)),
	};
}

export function buildModel(notes: NoteRecord[]): CrmModel {
	const model = emptyModel();
	for (const note of notes) {
		const kind = asString(note.frontmatter.crm);
		if (kind === 'client') model.clients.push(toClient(note));
		else if (kind === 'project') model.projects.push(toProject(note));
		else if (kind === 'deal') model.deals.push(toDeal(note));
	}

	const byName = new Map<string, Client>();
	for (const client of model.clients) byName.set(client.name, client);

	// model-wide aggregates from inline entries (own arrays still hold only the
	// note's own items at this point — spread copies references into new arrays).
	model.interactions = [
		...model.clients.flatMap((c) => c.interactions),
		...model.deals.flatMap((d) => d.interactions),
		...model.projects.flatMap((p) => p.interactions),
	];
	model.tasks = [
		...model.clients.flatMap((c) => c.tasks),
		...model.projects.flatMap((p) => p.tasks),
	];

	for (const project of model.projects) {
		if (project.client) byName.get(project.client)?.projects.push(project);
	}
	for (const deal of model.deals) {
		if (deal.client) byName.get(deal.client)?.deals.push(deal);
	}

	// Each client's timeline = its own inline interactions plus those of its
	// deals and projects.
	for (const client of model.clients) {
		client.interactions = [
			...client.interactions,
			...client.deals.flatMap((d) => d.interactions),
			...client.projects.flatMap((p) => p.interactions),
		];
	}

	// Progress derives from completed inline tasks, then milestones.
	for (const project of model.projects) {
		if (project.tasks.length) {
			const done = project.tasks.filter((t) => t.done).length;
			project.progress = Math.round((done / project.tasks.length) * 100);
		} else if (project.milestones.length) {
			const done = project.milestones.filter((m) => m.done).length;
			project.progress = Math.round((done / project.milestones.length) * 100);
		}
	}

	for (const client of model.clients) {
		client.relationship = deriveRelationship(client);
	}

	const byDateDesc = (a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date);
	for (const client of model.clients) client.interactions.sort(byDateDesc);
	for (const deal of model.deals) deal.interactions.sort(byDateDesc);
	model.interactions.sort(byDateDesc);
	model.clients.sort((a, b) => a.name.localeCompare(b.name));

	return model;
}

function deriveRelationship(client: Client): ClientRelationship {
	const hasOpenDeal = client.deals.some((d) => OPEN_DEAL_STAGES.includes(d.stage));
	const hasActiveProject = client.projects.some(
		(p) => p.status !== 'completed' && p.status !== 'cancelled',
	);
	if (hasOpenDeal || hasActiveProject) return 'active';
	if (client.deals.length > 0 || client.projects.length > 0) return 'past';
	return 'prospect';
}
