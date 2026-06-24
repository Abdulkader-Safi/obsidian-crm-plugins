<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { INTERACTION_TYPES, INTERACTION_LABELS, type InteractionType } from '../../crm/types';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	let {
		store,
		close,
		targetPath,
		targetLabel = '',
	}: { store: CrmStore; close: () => void; targetPath: string; targetLabel?: string } = $props();

	let title = $state('');
	let type = $state('email');
	let date = $state(new Date().toISOString().slice(0, 10));
	let summary = $state('');
	let nextAction = $state('');
	let saving = $state(false);

	const typeOptions = INTERACTION_TYPES.map((t) => ({ value: t, label: INTERACTION_LABELS[t] }));

	async function save() {
		if (!title.trim() || saving) return;
		saving = true;
		try {
			await store.logInteraction(
				targetPath,
				{ date, type: type as InteractionType, title: title.trim(), summary: summary.trim() },
				nextAction,
			);
			toast.success('Interaction logged');
			close();
		} finally {
			saving = false;
		}
	}
</script>

<h2 class="text-foreground mb-1 text-base font-semibold">Log interaction</h2>
{#if targetLabel}<p class="text-muted-foreground mb-4 text-xs">Saved in {targetLabel}'s note.</p>{/if}

<Field.FieldGroup>
	<Field.Field>
		<Field.FieldLabel for="li-title">Title</Field.FieldLabel>
		<Input id="li-title" bind:value={title} placeholder="e.g. Follow-up call" />
	</Field.Field>
	<Field.Field>
		<Field.FieldLabel>Type</Field.FieldLabel>
		<ToggleGroup.Root type="single" variant="outline" bind:value={type}>
			{#each typeOptions as o (o.value)}
				<ToggleGroup.Item
					value={o.value}
					class="data-[state=on]:bg-primary! data-[state=on]:text-primary-foreground! data-[state=on]:border-primary!"
				>
					{o.label}
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	</Field.Field>
	<Field.Field>
		<Field.FieldLabel for="li-date">Date</Field.FieldLabel>
		<Input id="li-date" type="date" bind:value={date} />
	</Field.Field>
	<Field.Field>
		<Field.FieldLabel for="li-summary">Summary</Field.FieldLabel>
		<Input id="li-summary" bind:value={summary} placeholder="What was discussed?" />
	</Field.Field>
	<Field.Field>
		<Field.FieldLabel for="li-next">Next action</Field.FieldLabel>
		<Input id="li-next" bind:value={nextAction} placeholder="Adds a task to this note" />
	</Field.Field>
	<Field.Field orientation="horizontal" class="justify-end">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!title.trim() || saving} onclick={save}>Log interaction</Button>
	</Field.Field>
</Field.FieldGroup>
