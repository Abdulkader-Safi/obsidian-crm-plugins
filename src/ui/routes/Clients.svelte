<script lang="ts">
	import type { CrmModel, Client, ClientStatus } from '../../crm/types';
	import { CLIENT_STATUSES, STATUS_LABELS } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as Empty from '$lib/components/ui/empty';
	import * as Popover from '$lib/components/ui/popover';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import TagChip from '$lib/components/TagChip.svelte';
	import Users from '@lucide/svelte/icons/users';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import Tag from '@lucide/svelte/icons/tag';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { model, search, go }: { model: CrmModel; search: string; go: Go } = $props();
	const crm = getCrm();

	let filter = $state('all');
	const selected = new SvelteSet<string>();
	let bulkTag = $state('');
	let bulkFollowUp = $state('');

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
	const allSelected = $derived(filtered.length > 0 && filtered.every((c) => selected.has(c.path)));

	function toggleAll(v: boolean) {
		if (v) for (const c of filtered) selected.add(c.path);
		else selected.clear();
	}
	function toggleOne(path: string, v: boolean) {
		if (v) selected.add(path);
		else selected.delete(path);
	}
	function selectedClients(): Client[] {
		return model.clients.filter((c) => selected.has(c.path));
	}

	async function bulkSetStatus(status: ClientStatus) {
		const n = selected.size;
		for (const p of [...selected]) await crm.store.setClientStatus(p, status);
		toast.success(`${n} client${n === 1 ? '' : 's'} → ${STATUS_LABELS[status]}`);
		selected.clear();
	}
	async function bulkAddTag() {
		const tag = bulkTag.trim().replace(/^#/, '');
		bulkTag = '';
		if (!tag) return;
		const clients = selectedClients();
		for (const c of clients) {
			if (!c.tags.includes(tag)) await crm.store.updateClient(c.path, { tags: [...c.tags, tag] });
		}
		toast.success(`Tagged ${clients.length} with #${tag}`);
		selected.clear();
	}
	async function bulkSetFollowUp() {
		if (!bulkFollowUp) return;
		const n = selected.size;
		for (const p of [...selected]) await crm.store.updateClient(p, { nextFollowUp: bulkFollowUp });
		bulkFollowUp = '';
		toast.success(`Follow-up set on ${n} client${n === 1 ? '' : 's'}`);
		selected.clear();
	}
	async function bulkDelete() {
		const clients = selectedClients();
		for (const c of clients) await crm.store.deleteClient(c);
		toast.success(`Deleted ${clients.length} client${clients.length === 1 ? '' : 's'}`);
		selected.clear();
	}

	function deadline(dateStr: string): string {
		const d = new Date(dateStr);
		return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en', { day: '2-digit', month: 'short' });
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

	{#if selected.size > 0}
		<div class="border-border bg-card flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 shadow-md">
			<div class="flex items-center gap-3.5">
				<span class="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs font-bold">
					{selected.size} selected
				</span>
				<div class="flex items-center gap-1.5">
					<Popover.Root>
						<Popover.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
							Set status
						</Popover.Trigger>
						<Popover.Content class="w-44 p-1">
							<div class="flex flex-col">
								{#each CLIENT_STATUSES as s (s)}
									<button
										class="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
										onclick={() => bulkSetStatus(s)}
									>
										<StatusBadge status={s} />
									</button>
								{/each}
							</div>
						</Popover.Content>
					</Popover.Root>

					<Popover.Root>
						<Popover.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
							<CalendarClock data-icon="inline-start" /> Set follow-up
						</Popover.Trigger>
						<Popover.Content class="flex w-56 flex-col gap-2 p-2">
							<Input type="date" bind:value={bulkFollowUp} />
							<Button size="sm" disabled={!bulkFollowUp} onclick={bulkSetFollowUp}>Apply</Button>
						</Popover.Content>
					</Popover.Root>

					<Popover.Root>
						<Popover.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
							<Tag data-icon="inline-start" /> Add tag
						</Popover.Trigger>
						<Popover.Content class="flex w-56 flex-col gap-2 p-2">
							<Input bind:value={bulkTag} placeholder="tag name" onkeydown={(e) => e.key === 'Enter' && bulkAddTag()} />
							<Button size="sm" disabled={!bulkTag.trim()} onclick={bulkAddTag}>Apply</Button>
						</Popover.Content>
					</Popover.Root>

					<Button variant="outline" size="sm" class="text-destructive! border-destructive!" onclick={bulkDelete}>
						<Trash2 data-icon="inline-start" /> Delete
					</Button>
				</div>
			</div>
			<Button variant="ghost" size="sm" onclick={() => selected.clear()}>
				<X data-icon="inline-start" /> Clear
			</Button>
		</div>
	{/if}

	{#if filtered.length}
		<div class="border-border overflow-hidden rounded-xl border">
			<Table.Root>
				<Table.Header>
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="w-10">
							<Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(v === true)} />
						</Table.Head>
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
						<Table.Row
							class="hover:bg-accent cursor-pointer"
							data-state={selected.has(client.path) ? 'selected' : undefined}
							onclick={() => go({ name: 'client', path: client.path })}
						>
							<Table.Cell onclick={(e) => e.stopPropagation()}>
								<Checkbox
									checked={selected.has(client.path)}
									onCheckedChange={(v) => toggleOne(client.path, v === true)}
								/>
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col gap-1">
									<span class="text-foreground font-medium">{client.name}</span>
									{#if sub(client)}<span class="text-muted-foreground text-xs">{sub(client)}</span>{/if}
									{#if client.tags.length}
										<span class="flex flex-wrap gap-1">
											{#each client.tags.slice(0, 3) as tag (tag)}<TagChip {tag} />{/each}
										</span>
									{/if}
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
