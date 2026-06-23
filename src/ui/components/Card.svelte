<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../lib/utils';

	let {
		title,
		class: className,
		children,
		actions,
	}: {
		title?: string;
		class?: string;
		children: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<section class={cn('border-border bg-card rounded-lg border p-4', className)}>
	{#if title || actions}
		<header class="mb-3 flex items-center justify-between">
			{#if title}
				<h2 class="text-foreground text-sm font-semibold">{title}</h2>
			{/if}
			{#if actions}{@render actions()}{/if}
		</header>
	{/if}
	{@render children()}
</section>
