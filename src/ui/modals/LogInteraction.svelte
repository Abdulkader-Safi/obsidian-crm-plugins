<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { INTERACTION_TYPES, INTERACTION_LABELS, type InteractionType } from '../../crm/types';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	let {
		store,
		close,
		targetPath,
		targetLabel = '',
		editIndex,
		interaction,
	}: {
		store: CrmStore;
		close: () => void;
		targetPath: string;
		targetLabel?: string;
		editIndex?: number;
		interaction?: { type: string; date: string; title: string; summary: string };
	} = $props();

	// svelte-ignore state_referenced_locally
	const isEdit = editIndex !== undefined;

	// svelte-ignore state_referenced_locally
	const seed = interaction;
	let title = $state(seed?.title ?? '');
	let type = $state(seed?.type ?? 'email');
	let date = $state(seed?.date || new Date().toISOString().slice(0, 10));
	let summary = $state(seed?.summary ?? '');
	let nextAction = $state('');
	let saving = $state(false);

	const typeOptions = INTERACTION_TYPES.map((t) => ({ value: t, label: INTERACTION_LABELS[t] }));

	async function save() {
		if (!title.trim() || saving) return;
		saving = true;
		const entry = { date, type: type as InteractionType, title: title.trim(), summary: summary.trim() };
		try {
			if (isEdit) {
				await store.editInteraction(targetPath, editIndex!, entry);
				toast.success('Interaction updated');
			} else {
				await store.logInteraction(targetPath, entry, nextAction);
				toast.success('Interaction logged');
			}
			close();
		} finally {
			saving = false;
		}
	}
</script>

<h2 class="text-foreground mb-1 text-base font-semibold">{isEdit ? 'Edit interaction' : 'Log interaction'}</h2>
{#if targetLabel}<p class="text-muted-foreground mb-4 text-xs">Saved in {targetLabel}'s note.</p>{/if}

<Field.FieldGroup>
	<Field.Field>
		<Field.FieldLabel for="li-title">Title</Field.FieldLabel>
		<Input id="li-title" bind:value={title} placeholder="e.g. Follow-up call" />
	</Field.Field>
	<div class="grid grid-cols-2 gap-4">
		<Field.Field>
			<Field.FieldLabel>Type</Field.FieldLabel>
			<Select.Root type="single" bind:value={type}>
				<Select.Trigger class="w-full">{INTERACTION_LABELS[type as InteractionType]}</Select.Trigger>
				<Select.Content>
					{#each typeOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="li-date">Date</Field.FieldLabel>
			<Input id="li-date" type="date" bind:value={date} />
		</Field.Field>
	</div>
	<Field.Field>
		<Field.FieldLabel for="li-summary">Summary</Field.FieldLabel>
		<Input id="li-summary" bind:value={summary} placeholder="What was discussed?" />
	</Field.Field>
	{#if !isEdit}
		<Field.Field>
			<Field.FieldLabel for="li-next">Next action</Field.FieldLabel>
			<Input id="li-next" bind:value={nextAction} placeholder="Adds a task to this note" />
		</Field.Field>
	{/if}
	<Field.Field orientation="horizontal" class="justify-end">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!title.trim() || saving} onclick={save}>{isEdit ? 'Save changes' : 'Log interaction'}</Button>
	</Field.Field>
</Field.FieldGroup>
