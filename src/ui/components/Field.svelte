<script lang="ts">
	import type { Snippet } from 'svelte';

	let { label, children }: { label: string; children: Snippet } = $props();
</script>

<label class="flex flex-col gap-1">
	<span class="text-muted-foreground text-xs font-medium">{label}</span>
	{@render children()}
</label>
