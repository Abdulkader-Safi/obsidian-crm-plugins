<script lang="ts">
	import type { CrmModel, Client } from '../../crm/types';
	import { CLIENT_STATUSES, STATUS_LABELS } from '../../crm/types';
	import type { Go } from '../router';
	import * as Table from '$lib/components/ui/table';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	let { model, search, go }: { model: CrmModel; search: string; go: Go } = $props();

	let filter = $state('all');

	const filtered = $derived(
		model.clients.filter((c) => {
			const matchesStatus = filter === 'all' || c.status === filter;
			const matchesSearch =
				!search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase());
			return matchesStatus && matchesSearch;
		}),
	);

	function money(c: Client): string {
		if (!c.value) return '—';
		return `${c.value.toLocaleString()} ${c.currency}`;
	}
</script>

<div class="flex flex-col gap-3">
	<ToggleGroup.Root type="single" variant="outline" size="sm" bind:value={filter}>
		<ToggleGroup.Item value="all">All</ToggleGroup.Item>
		{#each CLIENT_STATUSES as status (status)}
			<ToggleGroup.Item value={status}>{STATUS_LABELS[status]}</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>

	<div class="border-border overflow-hidden rounded-lg border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Client</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Service</Table.Head>
					<Table.Head>Value</Table.Head>
					<Table.Head>Country</Table.Head>
					<Table.Head>Next follow-up</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filtered as client (client.path)}
					<Table.Row class="hover:bg-accent cursor-pointer" onclick={() => go({ name: 'client', path: client.path })}>
						<Table.Cell class="text-foreground font-medium">{client.name}</Table.Cell>
						<Table.Cell><StatusBadge status={client.status} /></Table.Cell>
						<Table.Cell class="text-muted-foreground">{client.service || '—'}</Table.Cell>
						<Table.Cell class="text-foreground">{money(client)}</Table.Cell>
						<Table.Cell class="text-muted-foreground">{client.country || '—'}</Table.Cell>
						<Table.Cell class="text-muted-foreground">{client.nextFollowUp || '—'}</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="text-muted-foreground py-6 text-center">No clients yet.</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
