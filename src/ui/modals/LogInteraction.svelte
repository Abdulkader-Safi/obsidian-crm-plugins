<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { INTERACTION_TYPES, INTERACTION_LABELS, type InteractionType } from '../../crm/types';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	let {
		store,
		close,
		clientName = '',
	}: { store: CrmStore; close: () => void; clientName?: string } = $props();

	// svelte-ignore state_referenced_locally
	const clients = store.getModel().clients;
	// svelte-ignore state_referenced_locally
	let client = $state(clientName || (clients[0]?.name ?? ''));
	let project = $state('');
	let title = $state('');
	let type = $state('email');
	let medium = $state('');
	let date = $state(new Date().toISOString().slice(0, 10));
	let duration = $state('');
	let summary = $state('');
	let nextAction = $state('');
	let saving = $state(false);

	const clientOptions = $derived(clients.map((c) => ({ value: c.name, label: c.name })));
	const projectOptions = $derived([
		{ value: '', label: 'None' },
		...(clients.find((c) => c.name === client)?.projects ?? []).map((p) => ({
			value: p.name,
			label: p.name,
		})),
	]);
	const typeOptions = INTERACTION_TYPES.map((t) => ({ value: t, label: INTERACTION_LABELS[t] }));
	const projectLabel = $derived(
		projectOptions.find((o) => o.value === project)?.label ?? 'None',
	);

	async function save() {
		if (!client || !title.trim() || saving) return;
		saving = true;
		try {
			await store.logInteraction(
				{
					clientName: client,
					projectName: project || null,
					type: type as InteractionType,
					medium,
					date,
					duration: Number(duration) || 0,
					title: title.trim(),
					nextAction,
				},
				summary,
			);
			if (nextAction.trim()) {
				await store.createTask(nextAction.trim(), {
					clientName: client,
					projectName: project || null,
				});
			}
			toast.success('Interaction logged');
			close();
		} finally {
			saving = false;
		}
	}
</script>

<h2 class="text-foreground mb-4 text-base font-semibold">Log interaction</h2>

<Field.FieldGroup>
	<div class="grid grid-cols-2 gap-4">
		<Field.Field>
			<Field.FieldLabel>Client</Field.FieldLabel>
			<Select.Root type="single" bind:value={client}>
				<Select.Trigger class="w-full">{client || 'Select client'}</Select.Trigger>
				<Select.Content>
					{#each clientOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel>Project</Field.FieldLabel>
			<Select.Root type="single" bind:value={project}>
				<Select.Trigger class="w-full">{projectLabel}</Select.Trigger>
				<Select.Content>
					{#each projectOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
	</div>
	<Field.Field>
		<Field.FieldLabel for="li-title">Title</Field.FieldLabel>
		<Input id="li-title" bind:value={title} placeholder="e.g. Follow-up call" />
	</Field.Field>
	<Field.Field>
		<Field.FieldLabel>Type</Field.FieldLabel>
		<ToggleGroup.Root type="single" variant="outline" bind:value={type}>
			{#each typeOptions as o (o.value)}
				<ToggleGroup.Item value={o.value}>{o.label}</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	</Field.Field>
	<div class="grid grid-cols-3 gap-4">
		<Field.Field>
			<Field.FieldLabel for="li-medium">Medium</Field.FieldLabel>
			<Input id="li-medium" bind:value={medium} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="li-date">Date</Field.FieldLabel>
			<Input id="li-date" type="date" bind:value={date} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="li-duration">Duration (min)</Field.FieldLabel>
			<Input id="li-duration" type="number" bind:value={duration} />
		</Field.Field>
	</div>
	<Field.Field>
		<Field.FieldLabel for="li-summary">Summary</Field.FieldLabel>
		<Input id="li-summary" bind:value={summary} placeholder="What was discussed?" />
	</Field.Field>
	<Field.Field>
		<Field.FieldLabel for="li-next">Next action</Field.FieldLabel>
		<Input id="li-next" bind:value={nextAction} placeholder="What happens next?" />
	</Field.Field>
	<Field.Field orientation="horizontal" class="justify-end">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!client || !title.trim() || saving} onclick={save}>Log interaction</Button>
	</Field.Field>
</Field.FieldGroup>
