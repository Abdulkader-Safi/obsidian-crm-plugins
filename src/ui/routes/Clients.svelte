<script lang="ts">
	import type { CrmModel, Client, ClientStatus } from '../../crm/types';
	import { CLIENT_STATUSES, STATUS_LABELS } from '../../crm/types';
	import type { Go } from '../router';
	import StatusPill from '../components/StatusPill.svelte';

	let { model, search, go }: { model: CrmModel; search: string; go: Go } = $props();

	let filter = $state<ClientStatus | 'all'>('all');

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

<div class="mb-3 flex flex-wrap items-center gap-1">
	<button
		class="rounded px-2 py-1 text-xs"
		class:bg-secondary={filter === 'all'}
		class:text-muted-foreground={filter !== 'all'}
		onclick={() => (filter = 'all')}>All</button
	>
	{#each CLIENT_STATUSES as status (status)}
		<button
			class="rounded px-2 py-1 text-xs"
			class:bg-secondary={filter === status}
			class:text-muted-foreground={filter !== status}
			onclick={() => (filter = status)}>{STATUS_LABELS[status]}</button
		>
	{/each}
</div>

<div class="border-border overflow-hidden rounded-lg border">
	<table class="w-full text-sm">
		<thead class="text-muted-foreground border-border border-b text-left text-xs">
			<tr>
				<th class="px-3 py-2 font-medium">Client</th>
				<th class="px-3 py-2 font-medium">Status</th>
				<th class="px-3 py-2 font-medium">Service</th>
				<th class="px-3 py-2 font-medium">Value</th>
				<th class="px-3 py-2 font-medium">Country</th>
				<th class="px-3 py-2 font-medium">Next follow-up</th>
			</tr>
		</thead>
		<tbody>
			{#each filtered as client (client.path)}
				<tr
					class="border-border hover:bg-accent cursor-pointer border-b last:border-0"
					onclick={() => go({ name: 'client', path: client.path })}
				>
					<td class="text-foreground px-3 py-2 font-medium">{client.name}</td>
					<td class="px-3 py-2"><StatusPill status={client.status} /></td>
					<td class="text-muted-foreground px-3 py-2">{client.service || '—'}</td>
					<td class="text-foreground px-3 py-2">{money(client)}</td>
					<td class="text-muted-foreground px-3 py-2">{client.country || '—'}</td>
					<td class="text-muted-foreground px-3 py-2">{client.nextFollowUp || '—'}</td>
				</tr>
			{:else}
				<tr><td class="text-muted-foreground px-3 py-6 text-center" colspan="6">No clients yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
