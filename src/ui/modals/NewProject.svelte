<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus } from '../../crm/types';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

	let {
		store,
		close,
		clientName = '',
	}: { store: CrmStore; close: () => void; clientName?: string } = $props();

	// svelte-ignore state_referenced_locally
	const clients = store.getModel().clients;

	let name = $state('');
	// svelte-ignore state_referenced_locally
	let client = $state(clientName || (clients[0]?.name ?? ''));
	let status = $state('discovery');
	let service = $state('');
	let budget = $state('');
	let startDate = $state('');
	let dueDate = $state('');
	let paymentTerms = $state('50% upfront, 50% on delivery');
	let scope = $state('');
	let saving = $state(false);

	const clientOptions = clients.map((c) => ({ value: c.name, label: c.name }));
	const statusOptions = PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }));
	const TERMS = [
		'50% upfront, 50% on delivery',
		'100% upfront',
		'Milestone-based',
		'Net 30',
		'Hourly',
	];
	const termOptions = TERMS.map((t) => ({ value: t, label: t }));

	const statusLabel = $derived(PROJECT_STATUS_LABELS[status as ProjectStatus] ?? 'Select');
	const currency = $derived(clients.find((c) => c.name === client)?.currency || 'USD');

	async function save() {
		if (!name.trim() || saving) return;
		saving = true;
		try {
			await store.createProject(
				{
					name: name.trim(),
					clientName: client || null,
					status: status as ProjectStatus,
					service,
					budget: Number(budget) || 0,
					currency,
					startDate,
					dueDate,
					paymentTerms,
				},
				scope,
			);
			close();
		} finally {
			saving = false;
		}
	}
</script>

<h2 class="text-foreground mb-1 text-base font-semibold">New project</h2>
<p class="text-muted-foreground mb-4 text-xs">Linked to a client, saved in the Projects folder.</p>

<Field.FieldGroup>
	<Field.Field>
		<Field.FieldLabel for="np-name">Project name</Field.FieldLabel>
		<Input id="np-name" bind:value={name} placeholder="e.g. Website redesign" />
	</Field.Field>
	<div class="grid grid-cols-2 gap-4">
		<Field.Field>
			<Field.FieldLabel>Client</Field.FieldLabel>
			<Select.Root type="single" bind:value={client}>
				<Select.Trigger class="w-full">{client || 'None'}</Select.Trigger>
				<Select.Content>
					{#each clientOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel>Status</Field.FieldLabel>
			<Select.Root type="single" bind:value={status}>
				<Select.Trigger class="w-full">{statusLabel}</Select.Trigger>
				<Select.Content>
					{#each statusOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="np-service">Service</Field.FieldLabel>
			<Input id="np-service" bind:value={service} placeholder="e.g. Website + CMS" />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="np-budget">Budget</Field.FieldLabel>
			<Input id="np-budget" type="number" bind:value={budget} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="np-start">Start date</Field.FieldLabel>
			<Input id="np-start" type="date" bind:value={startDate} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="np-due">Deadline</Field.FieldLabel>
			<Input id="np-due" type="date" bind:value={dueDate} />
		</Field.Field>
	</div>
	<Field.Field>
		<Field.FieldLabel>Payment terms</Field.FieldLabel>
		<Select.Root type="single" bind:value={paymentTerms}>
			<Select.Trigger class="w-full">{paymentTerms}</Select.Trigger>
			<Select.Content>
				{#each termOptions as o (o.value)}
					<Select.Item value={o.value} label={o.label} />
				{/each}
			</Select.Content>
		</Select.Root>
	</Field.Field>
	<Field.Field>
		<Field.FieldLabel for="np-scope">Scope notes</Field.FieldLabel>
		<Input id="np-scope" bind:value={scope} placeholder="What's included in this project?" />
	</Field.Field>
	<Field.Field orientation="horizontal" class="justify-end">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!name.trim() || saving} onclick={save}>Create project</Button>
	</Field.Field>
</Field.FieldGroup>
