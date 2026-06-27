<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus, type Project } from '../../crm/types';
	import { projectFrontmatter } from '../../crm/frontmatter';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	let {
		store,
		close,
		clientName = '',
		project,
		defaultCurrency = 'USD',
	}: { store: CrmStore; close: () => void; clientName?: string; project?: Project; defaultCurrency?: string } = $props();

	// svelte-ignore state_referenced_locally
	const clients = store.getModel().clients;
	// svelte-ignore state_referenced_locally
	const p = project;
	const isEdit = !!p;

	let name = $state(p?.name ?? '');
	// svelte-ignore state_referenced_locally
	let client = $state(p?.client ?? clientName ?? (clients[0]?.name ?? ''));
	let status = $state(p?.status ?? 'discovery');
	let service = $state(p?.service ?? '');
	let budget = $state(p?.budget ? String(p.budget) : '');
	let startDate = $state(p?.startDate ?? '');
	let dueDate = $state(p?.dueDate ?? '');
	let paymentTerms = $state(p?.paymentTerms || '50% upfront, 50% on delivery');
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
	const currency = $derived(clients.find((c) => c.name === client)?.currency || defaultCurrency);

	async function save() {
		if (!name.trim() || saving) return;
		saving = true;
		const input = {
			name: name.trim(),
			clientName: client || null,
			status: status as ProjectStatus,
			service,
			budget: Number(budget) || 0,
			currency,
			startDate,
			dueDate,
			paymentTerms,
		};
		try {
			if (isEdit && project) {
				await store.updateProject(project.path, projectFrontmatter(input));
				toast.success(`Updated ${name.trim()}`);
			} else {
				await store.createProject(input, scope);
				toast.success(`Created project ${name.trim()}`);
			}
			close();
		} finally {
			saving = false;
		}
	}
</script>

<h2 class="text-foreground mb-1 text-base font-semibold">{isEdit ? 'Edit project' : 'New project'}</h2>
<p class="text-muted-foreground mb-4 text-xs">Linked to a client, saved in the Projects folder.</p>

<Field.FieldGroup>
	<Field.Field>
		<Field.FieldLabel for="np-name">Project name</Field.FieldLabel>
		<Input id="np-name" bind:value={name} placeholder="e.g. Website redesign" disabled={isEdit} />
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
	{#if !isEdit}
		<Field.Field>
			<Field.FieldLabel for="np-scope">Scope notes</Field.FieldLabel>
			<Input id="np-scope" bind:value={scope} placeholder="What's included in this project?" />
		</Field.Field>
	{/if}
	<Field.Field orientation="horizontal" class="justify-end">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!name.trim() || saving} onclick={save}>{isEdit ? 'Save changes' : 'Create project'}</Button>
	</Field.Field>
</Field.FieldGroup>
