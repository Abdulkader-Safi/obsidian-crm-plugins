<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { INTERACTION_LABELS } from '../../crm/types';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	let {
		store,
		close,
		path,
	}: { store: CrmStore; close: () => void; path: string } = $props();

	// svelte-ignore state_referenced_locally
	const it = store.getModel().interactions.find((i) => i.path === path);
	let deleting = $state(false);

	const meta = $derived(
		it
			? [
					['Client', it.client ?? '—'],
					['Project', it.project ?? 'None'],
					['Date', it.date || '—'],
					['Duration', it.duration ? `${it.duration} mins` : '—'],
				]
			: [],
	);

	async function remove() {
		if (!it || deleting) return;
		deleting = true;
		try {
			await store.deleteNote(it.path);
			close();
		} finally {
			deleting = false;
		}
	}
</script>

{#if it}
	<div class="flex flex-col gap-4">
		<div class="flex items-start justify-between gap-3">
			<h2 class="text-foreground text-base font-semibold">{it.title}</h2>
			<StatusBadge status={it.type} label={INTERACTION_LABELS[it.type]} />
		</div>

		<dl class="border-border grid grid-cols-2 gap-y-2 border-y py-3 text-sm">
			{#each meta as [term, value] (term)}
				<dt class="text-muted-foreground">{term}</dt>
				<dd class="text-foreground">{value}</dd>
			{/each}
		</dl>

		{#if it.summary}
			<div>
				<p class="text-muted-foreground mb-1 text-xs font-medium">Summary</p>
				<p class="text-foreground text-sm">{it.summary}</p>
			</div>
		{/if}

		{#if it.nextAction}
			<Alert.Root>
				<Alert.Title>Next action</Alert.Title>
				<Alert.Description>{it.nextAction}</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="text-muted-foreground flex items-center justify-between border-t border-border pt-3 text-xs">
			<span>Logged {it.date}</span>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={() => store.openNote(it.path)}>Open note</Button>
				<Button variant="destructive" size="sm" disabled={deleting} onclick={remove}>Delete</Button>
			</div>
		</div>
	</div>
{:else}
	<p class="text-muted-foreground text-sm">Interaction not found.</p>
{/if}
