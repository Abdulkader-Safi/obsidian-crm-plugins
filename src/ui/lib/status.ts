// Domain status colors and labels for clients and projects. Data-driven hues
// rendered as tinted fills, so they read on light and dark surfaces.
export const STATUS_HUE: Record<string, string> = {
	lead: '#8A8475',
	proposal: '#A9791F',
	negotiating: '#BC5E27',
	active: '#2E7D52',
	onhold: '#5E6E7A',
	completed: '#3C8C6A',
	lost: '#A53F34',
	won: '#3C8C6A',
	discovery: '#5E6E7A',
	development: '#BC5E27',
	review: '#A9791F',
	cancelled: '#A53F34',
};

export const STATUS_LABEL: Record<string, string> = {
	lead: 'Lead',
	proposal: 'Proposal',
	negotiating: 'Negotiating',
	active: 'Active',
	onhold: 'On hold',
	completed: 'Completed',
	lost: 'Lost',
	won: 'Won',
	discovery: 'Discovery',
	development: 'Development',
	review: 'Review',
	cancelled: 'Cancelled',
};

export function statusHue(status: string): string {
	return STATUS_HUE[status] ?? '#8A8475';
}

export function statusLabel(status: string): string {
	return STATUS_LABEL[status] ?? status;
}
