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

export interface Milestone {
	title: string;
	done: boolean;
}

export interface Project {
	path: string;
	name: string;
	client: string | null;
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
