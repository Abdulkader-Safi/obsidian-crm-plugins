<script lang="ts">
	import type { CrmModel } from '../../crm/types';
	import { CLIENT_STATUSES } from '../../crm/types';
	import type { Go } from '../router';
	import Card from '../components/Card.svelte';
	import StatusPill from '../components/StatusPill.svelte';

	let { model, go }: { model: CrmModel; go: Go } = $props();

	const pipeline = $derived(
		CLIENT_STATUSES.map((status) => {
			const clients = model.clients.filter((c) => c.status === status);
			const value = clients.reduce((sum, c) => sum + c.value, 0);
			return { status, count: clients.length, value };
		}),
	);

	const wonValue = $derived(
		model.clients.filter((c) => c.status === 'completed').reduce((s, c) => s + c.value, 0),
	);
	const openValue = $derived(
		model.clients
			.filter((c) => !['completed', 'lost'].includes(c.status))
			.reduce((s, c) => s + c.value, 0),
	);

	function weekAhead(dateStr: string): boolean {
		if (!dateStr) return false;
		const date = new Date(dateStr).getTime();
		if (Number.isNaN(date)) return false;
		const now = Date.now();
		return date >= now - 86400000 && date <= now + 7 * 86400000;
	}

	const followUps = $derived(model.clients.filter((c) => weekAhead(c.nextFollowUp)));
	const recent = $derived(model.interactions.slice(0, 8));
	const activeProjects = $derived(
		model.projects.filter((p) => !['completed', 'cancelled'].includes(p.status)),
	);
</script>

<div class="flex flex-col gap-4">
	<Card title="Pipeline">
		<div class="flex flex-wrap gap-4">
			{#each pipeline as item (item.status)}
				<div class="flex flex-col">
					<StatusPill status={item.status} />
					<span class="text-foreground mt-1 text-lg font-semibold">{item.count}</span>
					<span class="text-muted-foreground text-xs">{item.value.toLocaleString()}</span>
				</div>
			{/each}
		</div>
	</Card>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card title="Follow-ups this week">
			{#if followUps.length}
				<ul class="flex flex-col gap-2">
					{#each followUps as client (client.path)}
						<li class="flex items-center justify-between">
							<button
								class="text-foreground text-sm hover:underline"
								onclick={() => go({ name: 'client', path: client.path })}
								>{client.name}</button
							>
							<span class="text-muted-foreground text-xs">{client.nextFollowUp}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground text-sm">Nothing due this week.</p>
			{/if}
		</Card>

		<Card title="Finance">
			<div class="flex gap-6">
				<div>
					<p class="text-muted-foreground text-xs">Won</p>
					<p class="text-foreground text-lg font-semibold">{wonValue.toLocaleString()}</p>
				</div>
				<div>
					<p class="text-muted-foreground text-xs">Open pipeline</p>
					<p class="text-foreground text-lg font-semibold">{openValue.toLocaleString()}</p>
				</div>
			</div>
		</Card>
	</div>

	<Card title="Recent activity">
		{#if recent.length}
			<ul class="flex flex-col gap-2">
				{#each recent as it (it.path)}
					<li class="flex items-center justify-between text-sm">
						<span class="text-foreground">{it.title}</span>
						<span class="text-muted-foreground text-xs">{it.client ?? ''} · {it.date}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No interactions logged yet.</p>
		{/if}
	</Card>

	<Card title="Active projects">
		{#if activeProjects.length}
			<ul class="flex flex-col gap-2">
				{#each activeProjects as p (p.path)}
					<li class="flex items-center justify-between text-sm">
						<span class="text-foreground">{p.name}</span>
						<span class="text-muted-foreground flex items-center gap-2 text-xs">
							<StatusPill status={p.status} />
							{p.progress}%
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted-foreground text-sm">No active projects.</p>
		{/if}
	</Card>
</div>
