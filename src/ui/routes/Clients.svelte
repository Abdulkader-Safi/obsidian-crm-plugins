<script lang="ts">
	import type { CrmModel, Client } from '../../crm/types';
	import { CLIENT_STATUSES, STATUS_LABELS } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as Empty from '$lib/components/ui/empty';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import Users from '@lucide/svelte/icons/users';
	import Plus from '@lucide/svelte/icons/plus';

	let { model, search, go }: { model: CrmModel; search: string; go: Go } = $props();
	const crm = getCrm();

	let filter = $state('all');

	const statusOptions = [
		{ value: 'all', label: 'All statuses' },
		...CLIENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
	];
	const filterLabel = $derived(statusOptions.find((o) => o.value === filter)?.label ?? 'All statuses');

	const filtered = $derived(
		model.clients.filter((c) => {
			const matchesStatus = filter === 'all' || c.status === filter;
			const matchesSearch =
				!search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase());
			return matchesStatus && matchesSearch;
		}),
	);

	function deadline(dateStr: string): string {
		const d = new Date(dateStr);
		return Number.isNaN(d.getTime())
			? '—'
			: d.toLocaleString('en', { day: '2-digit', month: 'short' });
	}
	function sub(c: Client): string {
		return c.website || c.company || '';
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between">
		<Select.Root type="single" bind:value={filter}>
			<Select.Trigger class="w-44">{filterLabel}</Select.Trigger>
			<Select.Content>
				{#each statusOptions as o (o.value)}
					<Select.Item value={o.value} label={o.label} />
				{/each}
			</Select.Content>
		</Select.Root>
		<span class="text-muted-foreground text-[13px]">
			{filtered.length} client{filtered.length === 1 ? '' : 's'}
		</span>
	</div>

	{#if filtered.length}
		<div class="border-border overflow-hidden rounded-xl border">
			<Table.Root>
				<Table.Header>
					<Table.Row class="hover:bg-transparent">
						<Table.Head>Client</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Service</Table.Head>
						<Table.Head class="text-right">Value</Table.Head>
						<Table.Head>Source</Table.Head>
						<Table.Head>Country</Table.Head>
						<Table.Head>Follow-up</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filtered as client (client.path)}
						<Table.Row class="hover:bg-accent cursor-pointer" onclick={() => go({ name: 'client', path: client.path })}>
							<Table.Cell>
								<div class="flex flex-col">
									<span class="text-foreground font-medium">{client.name}</span>
									{#if sub(client)}<span class="text-muted-foreground text-xs">{sub(client)}</span>{/if}
								</div>
							</Table.Cell>
							<Table.Cell><StatusBadge status={client.status} /></Table.Cell>
							<Table.Cell class="text-muted-foreground">{client.service || '—'}</Table.Cell>
							<Table.Cell class="text-right">
								{#if client.value}
									<span class="text-foreground font-mono text-[13px] font-semibold">{client.value.toLocaleString()}</span>
									<span class="text-muted-foreground ml-1 text-[10px]">{client.currency}</span>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">{client.leadSource || '—'}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{client.country || '—'}</Table.Cell>
							<Table.Cell class="text-muted-foreground font-mono text-[13px]">{deadline(client.nextFollowUp)}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<Empty.Root class="border-border rounded-xl border border-dashed py-12">
			<Empty.Header>
				<Empty.Media variant="icon"><Users /></Empty.Media>
				<Empty.Title>No clients yet</Empty.Title>
				<Empty.Description>
					{search.trim() || filter !== 'all'
						? 'No clients match your filter.'
						: 'Add your first client to start tracking your pipeline.'}
				</Empty.Description>
			</Empty.Header>
			{#if !search.trim() && filter === 'all'}
				<Empty.Content>
					<Button size="sm" onclick={() => crm.openModal('new-client', {})}>
						<Plus data-icon="inline-start" /> New client
					</Button>
				</Empty.Content>
			{/if}
		</Empty.Root>
	{/if}
</div>
