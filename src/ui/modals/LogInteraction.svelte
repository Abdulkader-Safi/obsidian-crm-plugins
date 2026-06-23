<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { INTERACTION_TYPES, INTERACTION_LABELS, type InteractionType } from '../../crm/types';
	import Field from '../components/Field.svelte';
	import TextField from '../components/TextField.svelte';
	import SelectField from '../components/SelectField.svelte';
	import Segmented from '../components/Segmented.svelte';
	import { Button } from '../lib/components/ui/button';

	let {
		store,
		close,
		clientName = '',
	}: { store: CrmStore; close: () => void; clientName?: string } = $props();

	const clients = store.getModel().clients;
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
			close();
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<h2 class="text-foreground text-base font-semibold">Log interaction</h2>
	<div class="grid grid-cols-2 gap-3">
		<Field label="Client"><SelectField bind:value={client} options={clientOptions} /></Field>
		<Field label="Project"><SelectField bind:value={project} options={projectOptions} /></Field>
	</div>
	<Field label="Title"><TextField bind:value={title} placeholder="e.g. Follow-up call" /></Field>
	<Field label="Type"><Segmented bind:value={type} options={typeOptions} /></Field>
	<div class="grid grid-cols-3 gap-3">
		<Field label="Medium"><TextField bind:value={medium} /></Field>
		<Field label="Date"><TextField bind:value={date} type="date" /></Field>
		<Field label="Duration (min)"><TextField bind:value={duration} type="number" /></Field>
	</div>
	<Field label="Summary"><TextField bind:value={summary} placeholder="What was discussed?" /></Field>
	<Field label="Next action"><TextField bind:value={nextAction} placeholder="What happens next?" /></Field>
	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!client || !title.trim() || saving} onclick={save}>Log interaction</Button>
	</div>
</div>
