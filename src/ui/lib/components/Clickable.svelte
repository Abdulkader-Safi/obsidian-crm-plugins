<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		onclick,
		class: className = '',
		children,
	}: { onclick: () => void; class?: string; children: Snippet } = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick();
		}
	}
</script>

<div role="button" tabindex="0" class={className} {onclick} onkeydown={onKey}>
	{@render children()}
</div>
