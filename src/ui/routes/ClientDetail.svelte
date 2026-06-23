<script lang="ts">
	import type { Client } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	let { client, go }: { client: Client; go: Go } = $props();
	const crm = getCrm();

	function money(): string {
		return client.value ? `${client.value.toLocaleString()} ${client.currency}` : '—';
	}

	const deal = $derived([
		['Service', client.service],
		['Value', money()],
		['Lead source', client.leadSource],
		['Next follow-up', client.nextFollowUp],
		['Pitch as', client.pitchAs],
	] as const);

	const contact = $derived([
		['Email', client.email],
		['Phone', client.phone],
		['Website', client.website],
		['Primary contact', client.contact],
		['Country', client.country],
	] as const);
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-start justify-between">
		<div class="flex flex-col gap-1">
			<Button variant="link" size="sm" class="text-muted-foreground h-auto w-fit p-0" onclick={() => go({ name: 'clients' })}>
				← Clients
			</Button>
			<div class="flex items-center gap-2">
				<h1 class="text-foreground text-xl font-semibold">{client.name}</h1>
				<StatusBadge status={client.status} />
			</div>
			{#if client.company}<p class="text-muted-foreground text-sm">{client.company}</p>{/if}
		</div>
		<div class="flex gap-2">
			<Button size="sm" variant="secondary" onclick={() => crm.openModal('log-interaction', { clientName: client.name })}>
				Log interaction
			</Button>
			<Button size="sm" variant="outline" onclick={() => crm.openModal('new-client', { client })}>Edit</Button>
			<Button size="sm" variant="outline" onclick={() => crm.openNote(client.path)}>Open note</Button>
			<Button size="sm" variant="destructive" onclick={() => crm.openModal('delete-client', { clientPath: client.path })}>
				Delete
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header><Card.Title>Deal</Card.Title></Card.Header>
			<Card.Content>
				<dl class="grid grid-cols-2 gap-y-2 text-sm">
					{#each deal as [term, value] (term)}
						<dt class="text-muted-foreground">{term}</dt>
						<dd class="text-foreground">{value || '—'}</dd>
					{/each}
				</dl>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Title>Contact</Card.Title></Card.Header>
			<Card.Content>
				<dl class="grid grid-cols-2 gap-y-2 text-sm">
					{#each contact as [term, value] (term)}
						<dt class="text-muted-foreground">{term}</dt>
						<dd class="text-foreground">{value || '—'}</dd>
					{/each}
				</dl>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header><Card.Title>Interaction history</Card.Title></Card.Header>
		<Card.Content>
			{#if client.interactions.length}
				<div class="flex flex-col gap-3">
					{#each client.interactions as it (it.path)}
						<div class="border-border border-b pb-2 last:border-0">
							<button
								class="hover:bg-accent -mx-2 flex w-full items-center justify-between rounded px-2 py-1 text-left"
								onclick={() => crm.openModal('interaction-detail', { path: it.path })}
							>
								<span class="text-foreground text-sm font-medium">{it.title}</span>
								<span class="text-muted-foreground text-xs">{it.date}</span>
							</button>
							{#if it.summary}<p class="text-muted-foreground mt-1 text-sm">{it.summary}</p>{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">No interactions yet.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header><Card.Title>Action items</Card.Title></Card.Header>
		<Card.Content>
			{#if client.tasks.length}
				<div class="flex flex-col gap-2">
					{#each client.tasks as task (task.path)}
						<div class="flex items-center gap-2 text-sm">
							<Checkbox checked={task.done} onCheckedChange={(v) => crm.store.toggleTask(task.path, v === true)} />
							<span class="text-foreground" class:line-through={task.done}>{task.description}</span>
							{#if task.due}<span class="text-muted-foreground ml-auto text-xs">{task.due}</span>{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">No action items.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header><Card.Title>Projects</Card.Title></Card.Header>
		<Card.Content>
			{#if client.projects.length}
				<div class="flex flex-col gap-2">
					{#each client.projects as p (p.path)}
						<div class="flex items-center justify-between text-sm">
							<Button variant="link" size="sm" class="h-auto p-0" onclick={() => go({ name: 'project', path: p.path })}>{p.name}</Button>
							<span class="text-muted-foreground flex items-center gap-2 text-xs"><StatusBadge status={p.status} /> {p.progress}%</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">No linked projects.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
