<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { statusHue, statusLabel } from '$lib/status';

	let { status, label }: { status: string; label?: string } = $props();
	const hue = $derived(statusHue(status));
	const text = $derived(label ?? statusLabel(status));
</script>

<Badge variant="outline" class="border-transparent" style="background-color: {hue}22; color: {hue};">
	<span class="size-1.5 rounded-full" style="background-color: {hue};"></span>
	{text}
</Badge>
