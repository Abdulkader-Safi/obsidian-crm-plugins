<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import type { Client } from '../../crm/types';
	import { clientFrontmatter } from '../../crm/frontmatter';
	import { toast } from 'svelte-sonner';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';

	let { store, close, client, defaultCurrency = 'USD' }: { store: CrmStore; close: () => void; client?: Client; defaultCurrency?: string } = $props();

	// svelte-ignore state_referenced_locally
	const c = client;
	const isEdit = !!c;

	let name = $state(c?.name ?? '');
	let company = $state(c?.company ?? '');
	let industry = $state(c?.industry ?? '');
	let country = $state(c?.country ?? '');
	let region = $state(c?.region ?? '');
	let email = $state(c?.email ?? '');
	let phone = $state(c?.phone ?? '');
	let website = $state(c?.website ?? '');
	let contact = $state(c?.contact ?? '');
	let pitchAs = $state(c?.pitchAs ?? 'Freelance');
	let tags = $state((c?.tags ?? []).join(', '));
	let saving = $state(false);

	function parseTags(raw: string): string[] {
		return raw
			.split(',')
			.map((t) => t.trim().replace(/^#/, ''))
			.filter(Boolean);
	}

	async function save() {
		if (!name.trim() || saving) return;
		saving = true;
		const input = {
			name: name.trim(),
			company,
			industry,
			country,
			region,
			currency: client?.currency || defaultCurrency,
			email,
			phone,
			website,
			contact,
			pitchAs,
			tags: parseTags(tags),
		};
		try {
			if (isEdit && client) {
				await store.updateClient(client.path, clientFrontmatter(input));
				toast.success(`Updated ${input.name}`);
			} else {
				await store.createClient(input);
				toast.success(`Created ${input.name}`);
			}
			close();
		} finally {
			saving = false;
		}
	}
</script>

<h2 class="text-foreground mb-1 text-base font-semibold">{isEdit ? 'Edit client' : 'New client'}</h2>
<p class="text-muted-foreground mb-4 text-xs">The account. Track opportunities by adding deals to it.</p>

<Field.FieldGroup>
	<div class="grid grid-cols-2 gap-4">
		<Field.Field>
			<Field.FieldLabel for="nc-name">Client name</Field.FieldLabel>
			<Input id="nc-name" bind:value={name} placeholder="e.g. CoolPeak AC" disabled={isEdit} />
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
			<Field.FieldLabel for="nc-country">Country</Field.FieldLabel>
			<Input id="nc-country" bind:value={country} />
		</Field.Field>
		<Field.Field>
			<Field.FieldLabel for="nc-region">Region</Field.FieldLabel>
			<Input id="nc-region" bind:value={region} />
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
	</div>
	<Field.Field>
		<Field.FieldLabel for="nc-tags">Tags</Field.FieldLabel>
		<Input id="nc-tags" bind:value={tags} placeholder="hot-lead, cafe, referral" />
		<Field.FieldDescription>Comma-separated. Stored as a tags list in the note.</Field.FieldDescription>
	</Field.Field>
	<Field.Field orientation="horizontal" class="justify-end">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button size="sm" disabled={!name.trim() || saving} onclick={save}>{isEdit ? 'Save changes' : 'Create client'}</Button>
	</Field.Field>
</Field.FieldGroup>
