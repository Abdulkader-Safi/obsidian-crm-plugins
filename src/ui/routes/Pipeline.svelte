<script lang="ts">
	import type { CrmModel, Client, ClientStatus } from '../../crm/types';
	import { CLIENT_STATUSES, STATUS_LABELS } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import { statusHue } from '$lib/status';
	import { toast } from 'svelte-sonner';
	import * as Empty from '$lib/components/ui/empty';
	import { Button } from '$lib/components/ui/button';
	import Plus from '@lucide/svelte/icons/plus';
	import Kanban from '@lucide/svelte/icons/kanban';

	let { model, go }: { model: CrmModel; go: Go } = $props();
	const crm = getCrm();

	let dragPath = $state<string | null>(null);
	let overStatus = $state<string | null>(null);

	const columns = $derived(
		CLIENT_STATUSES.map((status) => ({
			status,
			clients: model.clients.filter((c) => c.status === status),
		})),
	);

	function initials(name: string): string {
		return name
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}

	function onDrop(status: ClientStatus) {
		const path = dragPath;
		overStatus = null;
		dragPath = null;
		if (path) {
			const client = model.clients.find((c) => c.path === path);
			void crm.store.setClientStatus(path, status);
			toast.success(`${client?.name ?? 'Client'} → ${STATUS_LABELS[status]}`);
		}
	}

	function money(c: Client): string {
		return c.value ? `${c.value.toLocaleString()} ${c.currency}` : '';
	}
</script>

{#if model.clients.length === 0}
	<Empty.Root class="border-border rounded-xl border border-dashed py-12">
		<Empty.Header>
			<Empty.Media variant="icon"><Kanban /></Empty.Media>
			<Empty.Title>Your pipeline is empty</Empty.Title>
			<Empty.Description>Add clients to see them across pipeline stages.</Empty.Description>
		</Empty.Header>
		<Empty.Content>
			<Button size="sm" onclick={() => crm.openModal('new-client', {})}>
				<Plus data-icon="inline-start" /> New client
			</Button>
		</Empty.Content>
	</Empty.Root>
{:else}
<div class="flex gap-3 overflow-x-auto pb-2">
	{#each columns as col (col.status)}
		<div
			role="list"
			class="border-border bg-secondary/40 flex w-56 shrink-0 flex-col gap-2 rounded-xl border p-2 transition-colors"
			class:ring-2={overStatus === col.status}
			class:ring-primary={overStatus === col.status}
			ondragover={(e) => {
				e.preventDefault();
				overStatus = col.status;
			}}
			ondragleave={() => (overStatus === col.status ? (overStatus = null) : null)}
			ondrop={() => onDrop(col.status)}
		>
			<div class="flex items-center justify-between px-1 py-0.5">
				<div class="flex items-center gap-1.5">
					<span class="size-2 rounded-full" style="background-color: {statusHue(col.status)};"></span>
					<span class="text-foreground text-[13px] font-semibold">{STATUS_LABELS[col.status]}</span>
					<span class="border-border bg-background text-muted-foreground rounded-full border px-1.5 text-[11px]">
						{col.clients.length}
					</span>
				</div>
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground cursor-pointer"
					aria-label="New client"
					onclick={() => crm.openModal('new-client', {})}
				>
					<Plus class="size-3.5" />
				</button>
			</div>

			{#each col.clients as client (client.path)}
				<div
					role="listitem"
					draggable="true"
					ondragstart={() => (dragPath = client.path)}
					ondragend={() => (dragPath = null)}
					class="border-border bg-card flex cursor-grab flex-col gap-2 rounded-lg border p-2.5 active:cursor-grabbing"
					class:opacity-50={dragPath === client.path}
				>
					<button class="flex items-center gap-2 text-left" onclick={() => go({ name: 'client', path: client.path })}>
						<span
							class="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold"
							style="background-color: {statusHue(col.status)}22; color: {statusHue(col.status)};"
						>
							{initials(client.name)}
						</span>
						<span class="text-foreground truncate text-[12.5px] font-semibold">{client.name}</span>
					</button>
					{#if client.service}
						<span class="text-muted-foreground truncate text-[11.5px]">{client.service}</span>
					{/if}
					{#if client.value}
						<div class="flex items-center justify-between pt-1">
							<span class="text-foreground font-mono text-xs">{money(client)}</span>
						</div>
					{/if}
				</div>
			{/each}

			{#if col.clients.length === 0}
				<p class="text-muted-foreground px-1 py-3 text-center text-xs">Drop here</p>
			{/if}
		</div>
	{/each}
</div>
{/if}
