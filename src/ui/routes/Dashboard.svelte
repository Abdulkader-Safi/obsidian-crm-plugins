<script lang="ts">
	import type { CrmModel } from '../../crm/types';
	import { CLIENT_STATUSES } from '../../crm/types';
	import type { Go } from '../router';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

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
	<Card.Root>
		<Card.Header>
			<Card.Title>Pipeline</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-4">
				{#each pipeline as item (item.status)}
					<div class="flex flex-col gap-1">
						<StatusBadge status={item.status} />
						<span class="text-foreground text-lg font-semibold">{item.count}</span>
						<span class="text-muted-foreground text-xs">{item.value.toLocaleString()}</span>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Follow-ups this week</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if followUps.length}
					<div class="flex flex-col gap-1">
						{#each followUps as client (client.path)}
							<div class="flex items-center justify-between">
								<Button variant="link" size="sm" class="h-auto p-0" onclick={() => go({ name: 'client', path: client.path })}>
									{client.name}
								</Button>
								<span class="text-muted-foreground text-xs">{client.nextFollowUp}</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">Nothing due this week.</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Finance</Card.Title>
			</Card.Header>
			<Card.Content>
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
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recent activity</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if recent.length}
				<div class="flex flex-col gap-2">
					{#each recent as it (it.path)}
						<div class="flex items-center justify-between text-sm">
							<span class="text-foreground">{it.title}</span>
							<span class="text-muted-foreground text-xs">{it.client ?? ''} · {it.date}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">No interactions logged yet.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Active projects</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if activeProjects.length}
				<div class="flex flex-col gap-2">
					{#each activeProjects as p (p.path)}
						<div class="flex items-center justify-between text-sm">
							<span class="text-foreground">{p.name}</span>
							<span class="text-muted-foreground flex items-center gap-2 text-xs">
								<StatusBadge status={p.status} />
								{p.progress}%
							</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">No active projects.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
