import {
	CLIENT_STATUSES,
	PROJECT_STATUSES,
	INTERACTION_TYPES,
	DEAL_STAGES,
	OPEN_DEAL_STAGES,
	type Client,
	type Project,
	type Interaction,
	type Task,
	type Deal,
	type ClientStatus,
	type ProjectStatus,
	type InteractionType,
	type DealStage,
	type ClientRelationship,
	type CrmModel,
} from './types';
import { parseWikilink, noteBasename, asString, asNumber, asBool } from './frontmatter';

export interface NoteRecord {
	path: string;
	frontmatter: Record<string, unknown>;
	body: string;
}

export function emptyModel(): CrmModel {
	return { clients: [], projects: [], interactions: [], tasks: [], deals: [] };
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

function dealStage(value: unknown): DealStage {
	const v = asString(value) as DealStage;
	return DEAL_STAGES.includes(v) ? v : 'lead';
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
		tags: toStringArray(fm.tags),
		relationship: 'prospect',
		interactions: [],
		tasks: [],
		projects: [],
		deals: [],
	};
}

function toDeal(note: NoteRecord): Deal {
	const fm = note.frontmatter;
	return {
		path: note.path,
		name: noteBasename(note.path),
		client: parseWikilink(fm.client),
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
		notes: note.body.trim(),
	};
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

function toProject(note: NoteRecord): Project {
	const fm = note.frontmatter;
	return {
		path: note.path,
		name: noteBasename(note.path),
		client: parseWikilink(fm.client),
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
		notes: note.body.trim(),
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
		else if (kind === 'deal') model.deals.push(toDeal(note));
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
	for (const deal of model.deals) {
		if (deal.client) byName.get(deal.client)?.deals.push(deal);
	}

	for (const client of model.clients) {
		client.relationship = deriveRelationship(client);
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

function deriveRelationship(client: Client): ClientRelationship {
	const hasOpenDeal = client.deals.some((d) => OPEN_DEAL_STAGES.includes(d.stage));
	const hasActiveProject = client.projects.some(
		(p) => p.status !== 'completed' && p.status !== 'cancelled',
	);
	if (hasOpenDeal || hasActiveProject) return 'active';
	if (client.deals.length > 0 || client.projects.length > 0) return 'past';
	return 'prospect';
}
