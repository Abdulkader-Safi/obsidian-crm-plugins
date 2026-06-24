import type { ProjectStatus, DealStage } from './types';

export function parseWikilink(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const match = trimmed.match(/^\[\[([^\]]+)\]\]$/);
	const inner = match ? match[1]! : trimmed;
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
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (typeof value === 'object') return JSON.stringify(value);
	return '';
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
	company?: string;
	industry?: string;
	country?: string;
	region?: string;
	currency: string;
	email?: string;
	phone?: string;
	website?: string;
	contact?: string;
	pitchAs?: string;
	tags?: string[];
}

export function clientFrontmatter(input: ClientInput): Record<string, unknown> {
	return {
		crm: 'client',
		company: input.company ?? '',
		industry: input.industry ?? '',
		country: input.country ?? '',
		region: input.region ?? '',
		currency: input.currency,
		email: input.email ?? '',
		phone: input.phone ?? '',
		website: input.website ?? '',
		contact: input.contact ?? '',
		pitchAs: input.pitchAs ?? '',
		tags: input.tags ?? [],
	};
}

export interface ProjectInput {
	name: string;
	clientName?: string | null;
	dealName?: string | null;
	status: ProjectStatus;
	service?: string;
	progress?: number;
	budget?: number;
	currency: string;
	startDate?: string;
	dueDate?: string;
	paymentTerms?: string;
}

export function projectFrontmatter(input: ProjectInput): Record<string, unknown> {
	const fm: Record<string, unknown> = {
		crm: 'project',
		status: input.status,
		service: input.service ?? '',
		progress: input.progress ?? 0,
		budget: input.budget ?? 0,
		currency: input.currency,
		startDate: input.startDate ?? '',
		dueDate: input.dueDate ?? '',
		paymentTerms: input.paymentTerms ?? '',
	};
	if (input.clientName) fm.client = toWikilink(input.clientName);
	if (input.dealName) fm.deal = toWikilink(input.dealName);
	return fm;
}

export interface DealInput {
	name: string;
	clientName?: string | null;
	stage: DealStage;
	value?: number;
	currency: string;
	service?: string;
	source?: string;
	expectedClose?: string;
	nextFollowUp?: string;
	followUpNote?: string;
	outcomeReason?: string;
	opened?: string;
}

export function dealFrontmatter(input: DealInput): Record<string, unknown> {
	const fm: Record<string, unknown> = {
		crm: 'deal',
		stage: input.stage,
		value: input.value ?? 0,
		currency: input.currency,
		service: input.service ?? '',
		source: input.source ?? '',
		expectedClose: input.expectedClose ?? '',
		nextFollowUp: input.nextFollowUp ?? '',
		followUpNote: input.followUpNote ?? '',
		outcomeReason: input.outcomeReason ?? '',
		opened: input.opened ?? '',
	};
	if (input.clientName) fm.client = toWikilink(input.clientName);
	return fm;
}
