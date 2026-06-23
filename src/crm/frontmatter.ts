import type { ClientStatus, InteractionType } from './types';

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
