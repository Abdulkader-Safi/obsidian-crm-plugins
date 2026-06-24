<script lang="ts">
	import type { CrmModel, Deal, DealStage } from '../../crm/types';
	import { DEAL_STAGES, DEAL_STAGE_LABELS, INTERACTION_LABELS } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { toast } from 'svelte-sonner';

	let { deal, model, go }: { deal: Deal; model: CrmModel; go: Go } = $props();
	const crm = getCrm();

	// svelte-ignore state_referenced_locally
	let reason = $state(deal.outcomeReason);
	let working = $state(false);

	const stageOptions = DEAL_STAGES.map((s) => ({ value: s, label: DEAL_STAGE_LABELS[s] }));
	const isClosed = $derived(deal.stage === 'won' || deal.stage === 'lost');
	const linkedProject = $derived(model.projects.find((p) => p.deal === deal.name));

	const details = $derived([
		['Service', deal.service],
		['Value', deal.value ? `${deal.value.toLocaleString()} ${deal.currency}` : '—'],
		['Source', deal.source],
		['Expected close', deal.expectedClose],
		['Next follow-up', deal.nextFollowUp],
	] as const);

	function openClient() {
		const c = model.clients.find((x) => x.name === deal.client);
		if (c) go({ name: 'client', path: c.path });
	}
	async function saveReason() {
		if (reason === deal.outcomeReason) return;
		await crm.store.updateDeal(deal.path, { outcomeReason: reason });
	}
	async function convert() {
		if (working) return;
		working = true;
		try {
			const path = await crm.store.convertDealToProject(deal, {
				name: `${deal.client ?? 'Project'} - ${deal.service || 'Project'}`,
				clientName: deal.client,
				status: 'discovery',
				service: deal.service,
				budget: deal.value,
				currency: deal.currency,
			});
			toast.success('Project created from deal');
			go({ name: 'project', path });
		} finally {
			working = false;
		}
	}
	async function remove() {
		if (working) return;
		working = true;
		try {
			await crm.store.deleteDeal(deal);
			toast.success('Deal deleted');
			go({ name: 'pipeline' });
		} finally {
			working = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<Button variant="link" size="sm" class="text-muted-foreground mb-2 h-auto w-fit p-0" onclick={() => go({ name: 'pipeline' })}>
			← Pipeline
		</Button>
		<div class="flex items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-2">
					<h1 class="text-foreground text-xl font-semibold">{deal.service || deal.name}</h1>
					<StatusBadge status={deal.stage} label={DEAL_STAGE_LABELS[deal.stage]} />
				</div>
				{#if deal.client}
					<button class="text-primary w-fit text-sm hover:underline" onclick={openClient}>{deal.client}</button>
				{/if}
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<Select.Root type="single" value={deal.stage} onValueChange={(v) => v && crm.store.setDealStage(deal.path, v as DealStage)}>
					<Select.Trigger class="w-36">{DEAL_STAGE_LABELS[deal.stage]}</Select.Trigger>
					<Select.Content>
						{#each stageOptions as o (o.value)}
							<Select.Item value={o.value} label={o.label} />
						{/each}
					</Select.Content>
				</Select.Root>
				<Button size="sm" variant="secondary" onclick={() => crm.openModal('log-interaction', { targetPath: deal.path, targetLabel: deal.service || deal.name })}>
					Log interaction
				</Button>
				<Button size="sm" variant="outline" onclick={() => crm.openNote(deal.path)}>Open note</Button>
				<Button size="sm" variant="destructive" onclick={remove}>Delete</Button>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-4 lg:flex-row">
		<div class="flex min-w-0 flex-1 flex-col gap-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title>Interactions</Card.Title>
					<Button size="sm" variant="outline" onclick={() => crm.openModal('log-interaction', { targetPath: deal.path, targetLabel: deal.service || deal.name })}>
						Log
					</Button>
				</Card.Header>
				<Card.Content>
					{#if deal.interactions.length}
						<div class="flex flex-col gap-3">
							{#each deal.interactions as it (it.name)}
								<div class="border-border border-b pb-2 last:border-0">
									<button class="crm-cardbtn -mx-2 rounded-lg px-2 py-1.5" onclick={() => crm.openNote(it.path)}>
										<span class="flex items-center justify-between gap-2">
											<span class="text-foreground text-sm font-medium">{it.title}</span>
											<span class="text-muted-foreground flex shrink-0 items-center gap-2 font-mono text-xs">
												<StatusBadge status={it.type} label={INTERACTION_LABELS[it.type]} />
												{it.date}
											</span>
										</span>
										{#if it.summary}<span class="text-muted-foreground text-sm">{it.summary}</span>{/if}
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">No interactions yet. Log one to start the timeline.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			{#if deal.notes}
				<Card.Root>
					<Card.Header><Card.Title>Notes</Card.Title></Card.Header>
					<Card.Content>
						<p class="text-foreground text-sm whitespace-pre-wrap">{deal.notes}</p>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<div class="flex shrink-0 flex-col gap-4 lg:w-[320px]">
			<Card.Root>
				<Card.Header><Card.Title>Deal</Card.Title></Card.Header>
				<Card.Content class="flex flex-col gap-3">
					<dl class="flex flex-col gap-2 text-sm">
						{#each details as [term, value] (term)}
							<div class="flex justify-between gap-3">
								<dt class="text-muted-foreground">{term}</dt>
								<dd class="text-foreground text-right">{value || '—'}</dd>
							</div>
						{/each}
					</dl>
					{#if linkedProject}
						<Button size="sm" variant="outline" onclick={() => go({ name: 'project', path: linkedProject.path })}>
							Open project
						</Button>
					{:else}
						<Button size="sm" disabled={working} onclick={convert}>Convert to project</Button>
					{/if}
				</Card.Content>
			</Card.Root>

			{#if isClosed}
				<Card.Root>
					<Card.Header><Card.Title>Outcome</Card.Title></Card.Header>
					<Card.Content>
						<Input bind:value={reason} placeholder="Why was it won or lost?" onblur={saveReason} />
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</div>
</div>
