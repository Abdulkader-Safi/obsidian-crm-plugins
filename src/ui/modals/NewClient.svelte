<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { CLIENT_STATUSES, STATUS_LABELS, type ClientStatus } from '../../crm/types';
	import Field from '../components/Field.svelte';
	import TextField from '../components/TextField.svelte';
	import SelectField from '../components/SelectField.svelte';
	import { Button } from '../lib/components/ui/button';

	let { store, close }: { store: CrmStore; close: () => void } = $props();

	let name = $state('');
	let company = $state('');
	let industry = $state('');
	let country = $state('');
	let region = $state('');
	let status = $state('lead');
	let service = $state('');
	let estValue = $state('');
	let leadSource = $state('');
	let email = $state('');
	let phone = $state('');
	let website = $state('');
	let contact = $state('');
	let pitchAs = $state('Freelance');
	let nextFollowUp = $state('');
	let followUpNote = $state('');
	let saving = $state(false);

	const statusOptions = CLIENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

	async function save() {
		if (!name.trim() || saving) return;
		saving = true;
		try {
			await store.createClient(
				{
					name: name.trim(),
					status: status as ClientStatus,
					company,
					industry,
					country,
					region,
					service,
					value: Number(estValue) || 0,
					currency: 'USD',
					leadSource,
					email,
					phone,
					website,
					contact,
					pitchAs,
					nextFollowUp,
					followUpNote,
				},
				followUpNote,
			);
			close();
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<h2 class="text-foreground text-base font-semibold">New client</h2>
	<div class="grid grid-cols-2 gap-3">
		<Field label="Client name"><TextField bind:value={name} placeholder="e.g. CoolPeak AC" /></Field>
		<Field label="Company"><TextField bind:value={company} /></Field>
		<Field label="Industry"><TextField bind:value={industry} /></Field>
		<Field label="Country"><TextField bind:value={country} /></Field>
		<Field label="Region"><TextField bind:value={region} /></Field>
		<Field label="Status"><SelectField bind:value={status} options={statusOptions} /></Field>
		<Field label="Service"><TextField bind:value={service} /></Field>
		<Field label="Estimated value"><TextField bind:value={estValue} type="number" /></Field>
		<Field label="Lead source"><TextField bind:value={leadSource} /></Field>
		<Field label="Email"><TextField bind:value={email} /></Field>
		<Field label="Phone"><TextField bind:value={phone} /></Field>
		<Field label="Website"><TextField bind:value={website} /></Field>
		<Field label="Primary contact"><TextField bind:value={contact} /></Field>
		<Field label="Pitch as"><TextField bind:value={pitchAs} /></Field>
		<Field label="Next follow-up"><TextField bind:value={nextFollowUp} type="date" /></Field>
	</div>
	<Field label="Follow-up note"><TextField bind:value={followUpNote} /></Field>
	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!name.trim() || saving} onclick={save}>Create client</Button>
	</div>
</div>
