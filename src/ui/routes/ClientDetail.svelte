<script lang="ts">
	import type { Client } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import Card from '../components/Card.svelte';
	import StatusPill from '../components/StatusPill.svelte';
	import { Button } from '../lib/components/ui/button';

	let { client, go }: { client: Client; go: Go } = $props();
	const crm = getCrm();

	function money(): string {
		return client.value ? `${client.value.toLocaleString()} ${client.currency}` : '—';
	}

	async function toggle(taskPath: string, done: boolean) {
		await crm.store.toggleTask(taskPath, done);
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-start justify-between">
		<div>
			<button
				class="text-muted-foreground mb-1 text-xs hover:underline"
				onclick={() => go({ name: 'clients' })}
			>
				← Clients
			</button>
			<div class="flex items-center gap-2">
				<h1 class="text-foreground text-xl font-semibold">{client.name}</h1>
				<StatusPill status={client.status} />
			</div>
			<p class="text-muted-foreground text-sm">{client.company || ''}</p>
		</div>
		<div class="flex gap-2">
			<Button
				size="sm"
				variant="secondary"
				onclick={() => crm.openModal('log-interaction', { clientName: client.name })}
			>
				Log interaction
			</Button>
			<Button size="sm" variant="outline" onclick={() => crm.openNote(client.path)}>Open note</Button>
			<Button
				size="sm"
				variant="destructive"
				onclick={() => crm.openModal('delete-client', { clientPath: client.path })}
			>
				Delete
			</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card title="Deal">
			<dl class="grid grid-cols-2 gap-y-2 text-sm">
				<dt class="text-muted-foreground">Service</dt>
				<dd class="text-foreground">{client.service || '—'}</dd>
				<dt class="text-muted-foreground">Value</dt>
				<dd class="text-foreground">{money()}</dd>
				<dt class="text-muted-foreground">Lead source</dt>
				<dd class="text-foreground">{client.leadSource || '—'}</dd>
				<dt class="text-muted-foreground">Next follow-up</dt>
				<dd class="text-foreground">{client.nextFollowUp || '—'}</dd>
				<dt class="text-muted-foreground">Pitch as</dt>
				<dd class="text-foreground">{client.pitchAs || '—'}</dd>
			</dl>
		</Card>
		<Card title="Contact">
			<dl class="grid grid-cols-2 gap-y-2 text-sm">
				<dt class="text-muted-foreground">Email</dt>
				<dd class="text-foreground">{client.email || '—'}</dd>
				<dt class="text-muted-foreground">Phone</dt>
				<dd class="text-foreground">{client.phone || '—'}</dd>
				<dt class="text-muted-foreground">Website</dt>
				<dd class="text-foreground">{client.website || '—'}</dd>
				<dt class="text-muted-foreground">Primary contact</dt>
				<dd class="text-foreground">{client.contact || '—'}</dd>
				<dt class="text-muted-foreground">Country</dt>
				<dd class="text-foreground">{client.country || '—'}</dd>
			</dl>
		</Card>
	</div>

	<Card title="Interaction history">
		{#if client.interactions.length}
			<ul class="flex flex-col gap-3">
				{#each client.interactions as it (it.path)}
					<li class="border-border border-b pb-2 last:border-0">
						<div class="flex items-center justify-between">
							<span class="text-foreground text-sm font-medium">{it.title}</span>
							<span class="text-muted-foreground text-xs">{it.date}</span>
						</div>
						{#if it.summary}<p class="text-muted-foreground mt-1 text-sm">{it.summary}</p>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No interactions yet.</p>
		{/if}
	</Card>

	<Card title="Action items">
		{#if client.tasks.length}
			<ul class="flex flex-col gap-2">
				{#each client.tasks as task (task.path)}
					<li class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={task.done}
							onchange={(e) => toggle(task.path, e.currentTarget.checked)}
						/>
						<span class="text-foreground" class:line-through={task.done}>{task.description}</span>
						{#if task.due}<span class="text-muted-foreground ml-auto text-xs">{task.due}</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No action items.</p>
		{/if}
	</Card>

	<Card title="Projects">
		{#if client.projects.length}
			<ul class="flex flex-col gap-2">
				{#each client.projects as p (p.path)}
					<li class="flex items-center justify-between text-sm">
						<button class="text-foreground hover:underline" onclick={() => crm.openNote(p.path)}
							>{p.name}</button
						>
						<span class="text-muted-foreground flex items-center gap-2 text-xs"
							><StatusPill status={p.status} /> {p.progress}%</span
						>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No linked projects.</p>
		{/if}
	</Card>
</div>
