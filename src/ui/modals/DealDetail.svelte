<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { DEAL_STAGES, DEAL_STAGE_LABELS, type DealStage } from '../../crm/types';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { toast } from 'svelte-sonner';

	let { store, close, path }: { store: CrmStore; close: () => void; path: string } = $props();

	// svelte-ignore state_referenced_locally
	const deal = store.getModel().deals.find((d) => d.path === path);
	let reason = $state(deal?.outcomeReason ?? '');
	let working = $state(false);

	const stageOptions = DEAL_STAGES.map((s) => ({ value: s, label: DEAL_STAGE_LABELS[s] }));
	const isClosed = $derived(deal?.stage === 'won' || deal?.stage === 'lost');

	const details = $derived(
		deal
			? [
					['Client', deal.client ?? '—'],
					['Service', deal.service || '—'],
					['Value', deal.value ? `${deal.value.toLocaleString()} ${deal.currency}` : '—'],
					['Source', deal.source || '—'],
					['Expected close', deal.expectedClose || '—'],
					['Next follow-up', deal.nextFollowUp || '—'],
				]
			: [],
	);

	async function setStage(stage: DealStage) {
		if (!deal) return;
		await store.setDealStage(deal.path, stage);
		toast.success(`Stage → ${DEAL_STAGE_LABELS[stage]}`);
	}
	async function saveReason() {
		if (!deal || reason === deal.outcomeReason) return;
		await store.updateDeal(deal.path, { outcomeReason: reason });
	}
	async function convert() {
		if (!deal || working) return;
		working = true;
		try {
			await store.convertDealToProject(deal, {
				name: `${deal.client ?? 'Project'} - ${deal.service || 'Project'}`,
				clientName: deal.client,
				status: 'discovery',
				service: deal.service,
				budget: deal.value,
				currency: deal.currency,
			});
			toast.success('Project created from deal');
			close();
		} finally {
			working = false;
		}
	}
	async function remove() {
		if (!deal || working) return;
		working = true;
		try {
			await store.deleteDeal(deal);
			toast.success('Deal deleted');
			close();
		} finally {
			working = false;
		}
	}
</script>

{#if deal}
	<div class="flex flex-col gap-4">
		<div class="flex items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h2 class="text-foreground text-base font-semibold">{deal.service || deal.name}</h2>
				<span class="text-muted-foreground text-sm">{deal.client ?? ''}</span>
			</div>
			<StatusBadge status={deal.stage} label={DEAL_STAGE_LABELS[deal.stage]} />
		</div>

		<div class="flex items-center gap-2">
			<span class="text-muted-foreground text-xs">Stage</span>
			<Select.Root type="single" value={deal.stage} onValueChange={(v) => v && setStage(v as DealStage)}>
				<Select.Trigger class="w-44">{DEAL_STAGE_LABELS[deal.stage]}</Select.Trigger>
				<Select.Content>
					{#each stageOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label} />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<dl class="border-border grid grid-cols-2 gap-y-2 border-y py-3 text-sm">
			{#each details as [term, value] (term)}
				<dt class="text-muted-foreground">{term}</dt>
				<dd class="text-foreground">{value}</dd>
			{/each}
		</dl>

		{#if isClosed}
			<label class="flex flex-col gap-1">
				<span class="text-muted-foreground text-xs font-medium">Outcome reason</span>
				<Input bind:value={reason} placeholder="Why was it won or lost?" onblur={saveReason} />
			</label>
		{/if}

		{#if deal.notes}
			<p class="text-muted-foreground text-sm whitespace-pre-wrap">{deal.notes}</p>
		{/if}

		<div class="flex items-center justify-between border-t border-border pt-3">
			<Button variant="outline" size="sm" onclick={() => store.openNote(deal.path)}>Open note</Button>
			<div class="flex gap-2">
				<Button size="sm" disabled={working} onclick={convert}>Convert to project</Button>
				<Button variant="destructive" size="sm" disabled={working} onclick={remove}>Delete</Button>
			</div>
		</div>
	</div>
{:else}
	<p class="text-muted-foreground text-sm">Deal not found.</p>
{/if}
