<script lang="ts">
	import type { CrmModel, Interaction, Deal } from '../../crm/types';
	import { DEAL_STAGES, DEAL_STAGE_LABELS, OPEN_DEAL_STAGES } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { statusHue } from '$lib/status';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import Users from '@lucide/svelte/icons/users';
	import StickyNote from '@lucide/svelte/icons/sticky-note';

	let { model, go }: { model: CrmModel; go: Go } = $props();
	const crm = getCrm();

	const pipeline = $derived(
		DEAL_STAGES.map((stage) => {
			const ds = model.deals.filter((d) => d.stage === stage);
			return { stage, count: ds.length, value: ds.reduce((s, d) => s + d.value, 0) };
		}),
	);
	const totalDeals = $derived(model.deals.length);
	const stageCount = $derived(pipeline.filter((p) => p.count > 0).length);

	const DAY = 86400000;
	function daysUntil(dateStr: string): number | null {
		if (!dateStr) return null;
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return null;
		const today = new Date();
		const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
		const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
		return Math.round((a - b) / DAY);
	}
	function reminder(dateStr: string) {
		const d = daysUntil(dateStr);
		if (d === null) return null;
		if (d < 0) return { kind: 'overdue', label: `${-d} day${d === -1 ? '' : 's'} overdue`, hue: statusHue('lost'), icon: CalendarX };
		if (d === 0) return { kind: 'today', label: 'Due today', hue: statusHue('negotiating'), icon: CalendarClock };
		return { kind: 'soon', label: `In ${d} day${d === 1 ? '' : 's'}`, hue: statusHue('lead'), icon: CalendarClock };
	}

	const followUps = $derived(
		model.deals
			.filter((d) => {
				if (!OPEN_DEAL_STAGES.includes(d.stage)) return false;
				const n = daysUntil(d.nextFollowUp);
				return n !== null && n <= 7;
			})
			.sort((a, b) => (a.nextFollowUp < b.nextFollowUp ? -1 : 1)),
	);
	const recent = $derived(model.interactions.slice(0, 6));
	const activeProjects = $derived(
		model.projects.filter((p) => !['completed', 'cancelled'].includes(p.status)),
	);

	// Currency-aware money: figures are per currency, never summed across currencies.
	const currencies = $derived([...new Set(model.deals.map((d) => d.currency).filter(Boolean))]);
	const currency = $derived(currencies[0] || model.clients[0]?.currency || 'USD');
	const wonValue = $derived(
		model.deals.filter((d) => d.stage === 'won' && d.currency === currency).reduce((s, d) => s + d.value, 0),
	);
	const openValue = $derived(
		model.deals
			.filter((d) => OPEN_DEAL_STAGES.includes(d.stage) && d.currency === currency)
			.reduce((s, d) => s + d.value, 0),
	);
	const wonCount = $derived(model.deals.filter((d) => d.stage === 'won').length);
	const barTotal = $derived(wonValue + openValue);
	const wonPct = $derived(barTotal ? Math.round((wonValue / barTotal) * 100) : 0);

	function dayOf(dateStr: string): string {
		const d = new Date(dateStr);
		return Number.isNaN(d.getTime()) ? '--' : String(d.getDate());
	}
	function monthOf(dateStr: string): string {
		const d = new Date(dateStr);
		return Number.isNaN(d.getTime())
			? ''
			: d.toLocaleString('en', { month: 'short' }).toUpperCase();
	}
	function deadline(dateStr: string): string {
		const d = new Date(dateStr);
		return Number.isNaN(d.getTime())
			? '—'
			: d.toLocaleString('en', { day: '2-digit', month: 'short' });
	}

	const ACT_ICON = { email: Mail, call: Phone, meeting: Users, followup: CalendarClock, note: StickyNote };
	function actIcon(it: Interaction) {
		return ACT_ICON[it.type] ?? StickyNote;
	}
</script>

<div class="flex flex-col gap-6">
	<!-- Pipeline -->
	<section class="flex flex-col gap-3.5">
		<div class="flex items-end justify-between">
			<div class="flex items-baseline gap-2.5">
				<h2 class="text-foreground text-base font-semibold">Pipeline</h2>
				<span class="text-muted-foreground text-[13px]">
					{totalDeals} deal{totalDeals === 1 ? '' : 's'} across {stageCount} stage{stageCount === 1 ? '' : 's'}
				</span>
			</div>
			<button
				class="text-primary flex items-center gap-1.5 text-[13px] font-medium hover:underline"
				onclick={() => go({ name: 'pipeline' })}
			>
				Open board <ArrowRight class="size-3.5" />
			</button>
		</div>
		<div class="border-border flex h-11 gap-0.5 overflow-hidden rounded-lg border">
			{#if totalDeals === 0}
				<div class="bg-muted flex-1"></div>
			{:else}
				{#each pipeline.filter((p) => p.count > 0) as seg (seg.stage)}
					<div style="flex: {seg.count}; background-color: {statusHue(seg.stage)};"></div>
				{/each}
			{/if}
		</div>
		<div class="flex flex-wrap gap-2">
			{#each pipeline as seg (seg.stage)}
				<span
					class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs"
					style="background-color: {statusHue(seg.stage)}1f;"
				>
					<span class="size-2 rounded-full" style="background-color: {statusHue(seg.stage)};"></span>
					<span class="font-semibold" style="color: {statusHue(seg.stage)};">{DEAL_STAGE_LABELS[seg.stage]}</span>
					<span class="text-foreground font-mono text-[12px]">{seg.count}</span>
				</span>
			{/each}
		</div>
	</section>

	<!-- Columns -->
	<div class="flex flex-col gap-6 lg:flex-row">
		<!-- Left -->
		<div class="flex min-w-0 flex-1 flex-col gap-6">
			<!-- Follow-ups -->
			<Card.Root class="gap-0 overflow-hidden p-0">
				<div class="border-border flex items-center justify-between border-b px-5 py-4">
					<div class="flex items-center gap-2.5">
						<span class="bg-primary/15 text-primary flex size-7 items-center justify-center rounded-lg">
							<CalendarClock class="size-4" />
						</span>
						<h3 class="text-foreground text-base font-semibold">Follow-ups due this week</h3>
					</div>
					{#if followUps.length}
						<span class="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-bold">
							{followUps.length} due
						</span>
					{/if}
				</div>
				{#if followUps.length}
					{#each followUps as deal (deal.path)}
						{@const r = reminder(deal.nextFollowUp)}
							<div class="border-border flex items-center gap-4 border-b px-5 py-3.5 last:border-0">
							<div class="flex w-10 shrink-0 flex-col items-center">
								<span class="text-foreground font-mono text-xl font-semibold leading-none">{dayOf(deal.nextFollowUp)}</span>
								<span class="text-muted-foreground mt-0.5 text-[10px] font-semibold tracking-wider">{monthOf(deal.nextFollowUp)}</span>
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2.5">
									<button class="text-foreground text-sm font-semibold hover:underline" onclick={() => crm.openModal('deal-detail', { path: deal.path })}>
										{deal.client ?? deal.service}
									</button>
									{#if deal.service}
										<span class="text-muted-foreground text-xs">{deal.service}</span>
									{/if}
									<StatusBadge status={deal.stage} />
										{#if r}
											<span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" style="background-color: {r.hue}22; color: {r.hue};">{r.label}</span>
										{/if}
								</div>
								{#if deal.followUpNote}
									<p class="text-muted-foreground mt-1 text-[13px]">{deal.followUpNote}</p>
								{/if}
							</div>
							{#if deal.client}
								<Button variant="outline" size="sm" onclick={() => crm.openModal('log-interaction', { clientName: deal.client })}>
									<MessageSquarePlus data-icon="inline-start" /> Log
								</Button>
							{/if}
						</div>
					{/each}
				{:else}
					<p class="text-muted-foreground px-5 py-6 text-sm">Nothing due this week.</p>
				{/if}
			</Card.Root>

			<!-- Active projects -->
			<Card.Root class="gap-0 overflow-hidden p-0">
				<div class="border-border flex items-center justify-between border-b px-5 py-4">
					<div class="flex items-baseline gap-2.5">
						<h3 class="text-foreground text-base font-semibold">Active projects</h3>
						<span class="text-muted-foreground text-xs">{activeProjects.length} in progress</span>
					</div>
					<button class="text-primary text-xs font-medium hover:underline">View all</button>
				</div>
				{#if activeProjects.length}
					<Table.Root>
						<Table.Header>
							<Table.Row class="hover:bg-transparent">
								<Table.Head>Project</Table.Head>
								<Table.Head>Client</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Deadline</Table.Head>
								<Table.Head class="text-right">Progress</Table.Head>
								<Table.Head class="text-right">Budget</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each activeProjects as p (p.path)}
								<Table.Row class="hover:bg-accent cursor-pointer" onclick={() => go({ name: 'project', path: p.path })}>
									<Table.Cell class="text-foreground font-medium">{p.name}</Table.Cell>
									<Table.Cell class="text-muted-foreground">{p.client ?? '—'}</Table.Cell>
									<Table.Cell>
										<span class="flex items-center gap-1.5">
											<span class="size-1.5 rounded-full" style="background-color: {statusHue(p.status)};"></span>
											<span class="text-foreground text-[13px] capitalize">{p.status}</span>
										</span>
									</Table.Cell>
									<Table.Cell class="text-muted-foreground font-mono text-[13px]">{deadline(p.dueDate)}</Table.Cell>
									<Table.Cell>
										<div class="flex items-center justify-end gap-2">
											<div class="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
												<div class="bg-primary h-full rounded-full" style="width: {Math.max(0, Math.min(100, p.progress))}%;"></div>
											</div>
											<span class="text-foreground w-9 text-right font-mono text-xs">{p.progress}%</span>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">
										<span class="text-foreground font-mono text-[13px] font-semibold">{p.budget.toLocaleString()}</span>
										<span class="text-muted-foreground ml-1 text-[10px]">{p.currency}</span>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{:else}
					<p class="text-muted-foreground px-5 py-6 text-sm">No active projects.</p>
				{/if}
			</Card.Root>
		</div>

		<!-- Right -->
		<div class="flex shrink-0 flex-col gap-6 lg:w-[380px]">
			<!-- This month -->
			<Card.Root class="gap-4 p-5">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<span class="flex size-7 items-center justify-center rounded-lg" style="background-color: {statusHue('active')}22; color: {statusHue('active')};">
							<Wallet class="size-4" />
						</span>
						<h3 class="text-foreground text-[15px] font-semibold">Revenue</h3>
					</div>
					<span class="text-muted-foreground font-mono text-xs">{currency}</span>
				</div>
				<div>
					<div class="flex items-end gap-1.5">
						<span class="text-foreground font-mono text-4xl font-semibold leading-none">{wonValue.toLocaleString()}</span>
						<span class="text-muted-foreground text-sm font-semibold">{currency}</span>
					</div>
					<p class="text-muted-foreground mt-1.5 text-xs">Won across {wonCount} deal{wonCount === 1 ? '' : 's'}</p>
				</div>
				<div class="h-2 overflow-hidden rounded-full" style="background-color: {statusHue('lead')}33;">
					<div class="h-full rounded-full" style="width: {wonPct}%; background-color: {statusHue('won')};"></div>
				</div>
				<div class="flex justify-between">
					<div class="flex flex-col gap-1">
						<span class="text-muted-foreground flex items-center gap-1.5 text-[13px] font-medium">
							<span class="size-2 rounded-full" style="background-color: {statusHue('won')};"></span> Won
						</span>
						<span><span class="text-foreground font-mono text-lg font-semibold">{wonValue.toLocaleString()}</span> <span class="text-muted-foreground text-[11px]">{currency}</span></span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-muted-foreground flex items-center gap-1.5 text-[13px] font-medium">
							<span class="size-2 rounded-full" style="background-color: {statusHue('lead')};"></span> Open pipeline
						</span>
						<span><span class="text-foreground font-mono text-lg font-semibold">{openValue.toLocaleString()}</span> <span class="text-muted-foreground text-[11px]">{currency}</span></span>
					</div>
				</div>
				{#if currencies.length > 1}
					<p class="text-muted-foreground text-[11px]">+ {currencies.length - 1} other currenc{currencies.length - 1 === 1 ? 'y' : 'ies'} not shown</p>
				{/if}
			</Card.Root>

			<!-- Recent activity -->
			<Card.Root class="gap-0 overflow-hidden p-0">
				<div class="border-border flex items-center justify-between border-b px-5 py-4">
					<h3 class="text-foreground text-[15px] font-semibold">Recent activity</h3>
					<button class="text-primary text-xs font-medium hover:underline">View log</button>
				</div>
				{#if recent.length}
					{#each recent as it (it.path)}
						{@const Icon = actIcon(it)}
						<button
							class="border-border hover:bg-accent flex w-full gap-3 border-b px-5 py-3.5 text-left last:border-0"
							onclick={() => crm.openModal('interaction-detail', { path: it.path })}
						>
							<span class="flex size-7 shrink-0 items-center justify-center rounded-full" style="background-color: {statusHue('lead')}22; color: {statusHue('lead')};">
								<Icon class="size-3.5" />
							</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center justify-between gap-2">
									<span class="text-foreground truncate text-[13px] font-medium">{it.client ?? it.title}</span>
									<span class="text-muted-foreground shrink-0 font-mono text-[11px]">{deadline(it.date)}</span>
								</div>
								{#if it.summary}<p class="text-muted-foreground mt-0.5 text-[13px]">{it.summary}</p>{/if}
							</div>
						</button>
					{/each}
				{:else}
					<p class="text-muted-foreground px-5 py-6 text-sm">No interactions logged yet.</p>
				{/if}
			</Card.Root>
		</div>
	</div>
</div>
