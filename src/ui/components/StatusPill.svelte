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
