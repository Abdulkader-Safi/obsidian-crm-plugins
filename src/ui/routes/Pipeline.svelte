<script lang="ts">
	import type { CrmModel, Deal, DealStage } from '../../crm/types';
	import { DEAL_STAGES, DEAL_STAGE_LABELS } from '../../crm/types';
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
	let overStage = $state<string | null>(null);

	const columns = $derived(
		DEAL_STAGES.map((stage) => ({
			stage,
			deals: model.deals.filter((d) => d.stage === stage),
			value: model.deals.filter((d) => d.stage === stage).reduce((s, d) => s + d.value, 0),
		})),
	);

	function onDrop(stage: DealStage) {
		const path = dragPath;
		overStage = null;
		dragPath = null;
		if (path) {
			const deal = model.deals.find((d) => d.path === path);
			void crm.store.setDealStage(path, stage);
			toast.success(`${deal?.service ?? 'Deal'} → ${DEAL_STAGE_LABELS[stage]}`);
		}
	}

	function money(d: Deal): string {
		return d.value ? `${d.value.toLocaleString()} ${d.currency}` : '';
	}
</script>

{#if model.deals.length === 0}
	<Empty.Root class="border-border rounded-xl border border-dashed py-12">
		<Empty.Header>
			<Empty.Media variant="icon"><Kanban /></Empty.Media>
			<Empty.Title>No deals yet</Empty.Title>
			<Empty.Description>Create a deal to track an opportunity through the pipeline.</Empty.Description>
		</Empty.Header>
		<Empty.Content>
			<Button size="sm" onclick={() => crm.openModal('new-deal', {})}>
				<Plus data-icon="inline-start" /> New deal
			</Button>
		</Empty.Content>
	</Empty.Root>
{:else}
	<div class="flex gap-4 overflow-x-auto pb-2">
		{#each columns as col (col.stage)}
			<div
				role="list"
				class="border-border bg-secondary/40 flex w-80 shrink-0 flex-col gap-2 rounded-xl border p-3 transition-colors"
				class:ring-2={overStage === col.stage}
				class:ring-primary={overStage === col.stage}
				ondragover={(e) => {
					e.preventDefault();
					overStage = col.stage;
				}}
				ondragleave={() => (overStage === col.stage ? (overStage = null) : null)}
				ondrop={() => onDrop(col.stage)}
			>
				<div class="flex items-center justify-between px-1 py-0.5">
					<div class="flex items-center gap-1.5">
						<span class="size-2 rounded-full" style="background-color: {statusHue(col.stage)};"></span>
						<span class="text-foreground text-[13px] font-semibold">{DEAL_STAGE_LABELS[col.stage]}</span>
						<span class="border-border bg-background text-muted-foreground rounded-full border px-1.5 text-[11px]">
							{col.deals.length}
						</span>
					</div>
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground cursor-pointer"
						aria-label="New deal"
						onclick={() => crm.openModal('new-deal', { stage: col.stage })}
					>
						<Plus class="size-3.5" />
					</button>
				</div>
				{#if col.value > 0}
					<span class="text-muted-foreground px-1 font-mono text-[11px]">{col.value.toLocaleString()}</span>
				{/if}

				{#each col.deals as deal (deal.path)}
					<div
						role="listitem"
						draggable="true"
						ondragstart={() => (dragPath = deal.path)}
						ondragend={() => (dragPath = null)}
						class="border-border bg-card flex cursor-grab flex-col gap-2 rounded-lg border p-2.5 active:cursor-grabbing"
						class:opacity-50={dragPath === deal.path}
					>
						<button class="crm-rowbtn !px-0 !py-0 hover:!bg-transparent" onclick={() => go({ name: 'deal', path: deal.path })}>
							<span class="text-foreground truncate text-[12.5px] font-semibold">{deal.client ?? deal.service}</span>
						</button>
						{#if deal.service}
							<span class="text-muted-foreground truncate text-[11.5px]">{deal.service}</span>
						{/if}
						{#if deal.value}
							<span class="text-foreground font-mono text-xs">{money(deal)}</span>
						{/if}
					</div>
				{/each}

				{#if col.deals.length === 0}
					<p class="text-muted-foreground px-1 py-3 text-center text-xs">Drop here</p>
				{/if}
			</div>
		{/each}
	</div>
{/if}
