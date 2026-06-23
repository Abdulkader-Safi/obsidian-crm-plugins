<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { CLIENT_STATUSES, STATUS_LABELS, type ClientStatus } from '../../crm/types';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

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
	const statusLabel = $derived(STATUS_LABELS[status as ClientStatus] ?? 'Select status');

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

<h2 class="text-foreground mb-4 text-base font-semibold">New client</h2>

<Field.FieldGroup>
	<div class="grid grid-cols-2 gap-4">
		<Field.Field>
			<Field.FieldLabel for="nc-name">Client name</Field.FieldLabel>
			<Input id="nc-name" bind:value={name} placeholder="e.g. CoolPeak AC" />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-company">Company</Field.FieldLabel>
			<Input id="nc-company" bind:value={company} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-industry">Industry</Field.FieldLabel>
			<Input id="nc-industry" bind:value={industry} />
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
			<Field.FieldLabel for="nc-country">Country</Field.FieldLabel>
			<Input id="nc-country" bind:value={country} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-region">Region</Field.FieldLabel>
			<Input id="nc-region" bind:value={region} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-service">Service</Field.FieldLabel>
			<Input id="nc-service" bind:value={service} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-value">Estimated value</Field.FieldLabel>
			<Input id="nc-value" type="number" bind:value={estValue} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-source">Lead source</Field.FieldLabel>
			<Input id="nc-source" bind:value={leadSource} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-pitch">Pitch as</Field.FieldLabel>
			<Input id="nc-pitch" bind:value={pitchAs} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-email">Email</Field.FieldLabel>
			<Input id="nc-email" bind:value={email} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-phone">Phone</Field.FieldLabel>
			<Input id="nc-phone" bind:value={phone} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-website">Website</Field.FieldLabel>
			<Input id="nc-website" bind:value={website} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-contact">Primary contact</Field.FieldLabel>
			<Input id="nc-contact" bind:value={contact} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-follow">Next follow-up</Field.FieldLabel>
			<Input id="nc-follow" type="date" bind:value={nextFollowUp} />
		</Field.Field>
	</div>
	<Field.Field>
		<Field.FieldLabel for="nc-note">Follow-up note</Field.FieldLabel>
		<Input id="nc-note" bind:value={followUpNote} placeholder="What's the next step?" />
	</Field.Field>
	<Field.Field orientation="horizontal" class="justify-end">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!name.trim() || saving} onclick={save}>Create client</Button>
	</Field.Field>
</Field.FieldGroup>
