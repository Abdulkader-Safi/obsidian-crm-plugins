export type ProjectStatus =
	| 'discovery'
	| 'development'
	| 'review'
	| 'completed'
	| 'cancelled';

export type InteractionType = 'call' | 'meeting' | 'email' | 'followup' | 'note';

export type DealStage = 'lead' | 'proposal' | 'negotiating' | 'won' | 'lost';

export type ClientRelationship = 'prospect' | 'active' | 'past';

export const DEAL_STAGES: DealStage[] = ['lead', 'proposal', 'negotiating', 'won', 'lost'];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
	lead: 'Lead',
	proposal: 'Proposal',
	negotiating: 'Negotiating',
	won: 'Won',
	lost: 'Lost',
};

export const OPEN_DEAL_STAGES: DealStage[] = ['lead', 'proposal', 'negotiating'];

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
	index: number;
}

export interface Task {
	path: string;
	name: string;
	client: string | null;
	project: string | null;
	done: boolean;
	due: string;
	description: string;
	notes: string;
	inline: boolean;
	index: number;
}

export interface Milestone {
	title: string;
	done: boolean;
}

export interface Deal {
	path: string;
	name: string;
	client: string | null;
	stage: DealStage;
	value: number;
	currency: string;
	service: string;
	source: string;
	expectedClose: string;
	nextFollowUp: string;
	followUpNote: string;
	outcomeReason: string;
	opened: string;
	notes: string;
	interactions: Interaction[];
}

export interface Project {
	path: string;
	name: string;
	client: string | null;
	deal: string | null;
	status: ProjectStatus;
	service: string;
	progress: number;
	budget: number;
	currency: string;
	startDate: string;
	dueDate: string;
	paymentTerms: string;
	milestones: Milestone[];
	notes: string;
	tasks: Task[];
	interactions: Interaction[];
}

export interface Client {
	path: string;
	name: string;
	company: string;
	industry: string;
	country: string;
	region: string;
	currency: string;
	email: string;
	phone: string;
	website: string;
	contact: string;
	pitchAs: string;
	tags: string[];
	relationship: ClientRelationship;
	interactions: Interaction[];
	tasks: Task[];
	projects: Project[];
	deals: Deal[];
}

export interface CrmModel {
	clients: Client[];
	projects: Project[];
	interactions: Interaction[];
	tasks: Task[];
	deals: Deal[];
}
