<script lang="ts">
	import type { CrmModel, Project } from '../../crm/types';
	import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import * as Table from '$lib/components/ui/table';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import * as Empty from '$lib/components/ui/empty';
	import { Button } from '$lib/components/ui/button';
	import { statusHue } from '$lib/status';
	import Plus from '@lucide/svelte/icons/plus';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';

	let { model, search, go }: { model: CrmModel; search: string; go: Go } = $props();
	const crm = getCrm();

	let filter = $state('all');

	const filtered = $derived(
		model.projects.filter((p) => {
			const matchesStatus = filter === 'all' || p.status === filter;
			const matchesSearch =
				!search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase());
			return matchesStatus && matchesSearch;
		}),
	);

	function money(p: Project): string {
		return p.budget ? `${p.budget.toLocaleString()} ${p.currency}` : '—';
	}
	function deadline(dateStr: string): string {
		const d = new Date(dateStr);
		return Number.isNaN(d.getTime())
			? '—'
			: d.toLocaleString('en', { day: '2-digit', month: 'short' });
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<ToggleGroup.Root type="single" variant="outline" size="sm" bind:value={filter}>
			<ToggleGroup.Item value="all" class="crm-seg">All</ToggleGroup.Item>
			{#each PROJECT_STATUSES as status (status)}
				<ToggleGroup.Item value={status} class="crm-seg">{PROJECT_STATUS_LABELS[status]}</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
		<Button size="sm" onclick={() => crm.openModal('new-project', {})}>
			<Plus data-icon="inline-start" /> New project
		</Button>
	</div>

	{#if filtered.length}
		<div class="border-border overflow-hidden rounded-xl border">
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
					{#each filtered as project (project.path)}
						<Table.Row class="hover:bg-accent cursor-pointer" onclick={() => go({ name: 'project', path: project.path })}>
							<Table.Cell class="text-foreground font-medium">{project.name}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{project.client ?? '—'}</Table.Cell>
							<Table.Cell>
								<span class="flex items-center gap-1.5">
									<span class="size-1.5 rounded-full" style="background-color: {statusHue(project.status)};"></span>
									<span class="text-foreground text-[13px] capitalize">{project.status}</span>
								</span>
							</Table.Cell>
							<Table.Cell class="text-muted-foreground font-mono text-[13px]">{deadline(project.dueDate)}</Table.Cell>
							<Table.Cell>
								<div class="flex items-center justify-end gap-2">
									<div class="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
										<div class="bg-primary h-full rounded-full" style="width: {Math.max(0, Math.min(100, project.progress))}%;"></div>
									</div>
									<span class="text-foreground w-9 text-right font-mono text-xs">{project.progress}%</span>
								</div>
							</Table.Cell>
							<Table.Cell class="text-foreground text-right font-mono text-[13px]">{money(project)}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<Empty.Root class="border-border rounded-xl border border-dashed py-12">
			<Empty.Header>
				<Empty.Media variant="icon"><FolderKanban /></Empty.Media>
				<Empty.Title>No projects yet</Empty.Title>
				<Empty.Description>
					{search.trim() || filter !== 'all'
						? 'No projects match your filter.'
						: 'Create a project and link it to a client.'}
				</Empty.Description>
			</Empty.Header>
			{#if !search.trim() && filter === 'all'}
				<Empty.Content>
					<Button size="sm" onclick={() => crm.openModal('new-project', {})}>
						<Plus data-icon="inline-start" /> New project
					</Button>
				</Empty.Content>
			{/if}
		</Empty.Root>
	{/if}
</div>
