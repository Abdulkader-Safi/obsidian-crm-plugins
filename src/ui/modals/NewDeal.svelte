<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { DEAL_STAGES, DEAL_STAGE_LABELS, type DealStage } from '../../crm/types';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	let {
		store,
		close,
		clientName = '',
		stage: initialStage = 'lead',
	}: { store: CrmStore; close: () => void; clientName?: string; stage?: string } = $props();

	// svelte-ignore state_referenced_locally
	const clients = store.getModel().clients;

	// svelte-ignore state_referenced_locally
	let client = $state(clientName || (clients[0]?.name ?? ''));
	let service = $state('');
	// svelte-ignore state_referenced_locally
	let stage = $state(initialStage);
	let value = $state('');
	let source = $state('');
	let expectedClose = $state('');
	let nextFollowUp = $state('');
	let notes = $state('');
	let saving = $state(false);

	const clientOptions = clients.map((c) => ({ value: c.name, label: c.name }));
	const stageOptions = DEAL_STAGES.map((s) => ({ value: s, label: DEAL_STAGE_LABELS[s] }));
	const stageLabel = $derived(DEAL_STAGE_LABELS[stage as DealStage] ?? 'Select');
	const currency = $derived(clients.find((c) => c.name === client)?.currency || 'USD');

	async function save() {
		if (!client || !service.trim() || saving) return;
		saving = true;
		try {
			await store.createDeal(
				{
					name: `${client} - ${service.trim()}`,
					clientName: client,
					stage: stage as DealStage,
					value: Number(value) || 0,
					currency,
					service: service.trim(),
					source,
					expectedClose,
					nextFollowUp,
				},
				notes,
			);
			toast.success(`Deal created for ${client}`);
			close();
		} finally {
			saving = false;
		}
	}
</script>

<h2 class="text-foreground mb-1 text-base font-semibold">New deal</h2>
<p class="text-muted-foreground mb-4 text-xs">An opportunity with a client, tracked through the pipeline.</p>

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
			<Field.FieldLabel>Stage</Field.FieldLabel>
			<Select.Root type="single" bind:value={stage}>
				<Select.Trigger class="w-full">{stageLabel}</Select.Trigger>
				<Select.Content>
					{#each stageOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
	</div>
	<Field.Field>
		<Field.FieldLabel for="nd-service">Service</Field.FieldLabel>
		<Input id="nd-service" bind:value={service} placeholder="e.g. Website redesign" />
	</Field.Field>
	<div class="grid grid-cols-2 gap-4">
		<Field.Field>
			<Field.FieldLabel for="nd-value">Value</Field.FieldLabel>
			<Input id="nd-value" type="number" bind:value />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nd-source">Source</Field.FieldLabel>
			<Input id="nd-source" bind:value={source} placeholder="e.g. Web search" />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nd-close">Expected close</Field.FieldLabel>
			<Input id="nd-close" type="date" bind:value={expectedClose} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nd-follow">Next follow-up</Field.FieldLabel>
			<Input id="nd-follow" type="date" bind:value={nextFollowUp} />
		</Field.Field>
	</div>
	<Field.Field>
		<Field.FieldLabel for="nd-notes">Notes</Field.FieldLabel>
		<Input id="nd-notes" bind:value={notes} placeholder="Context for this opportunity" />
	</Field.Field>
	<Field.Field orientation="horizontal" class="justify-end">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!client || !service.trim() || saving} onclick={save}>Create deal</Button>
	</Field.Field>
</Field.FieldGroup>
