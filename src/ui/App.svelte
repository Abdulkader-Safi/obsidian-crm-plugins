<script lang="ts">
	import { getCrm } from './context';
	import type { Route } from './router';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import Clients from './routes/Clients.svelte';
	import Dashboard from './routes/Dashboard.svelte';
	import ClientDetail from './routes/ClientDetail.svelte';
	import Projects from './routes/Projects.svelte';
	import ProjectDetail from './routes/ProjectDetail.svelte';
	import Pipeline from './routes/Pipeline.svelte';
	import DealDetail from './routes/DealDetail.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Kanban from '@lucide/svelte/icons/kanban';
	import Users from '@lucide/svelte/icons/users';
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';

	const crm = getCrm();
	let model = $state(crm.store.getModel());
	let route = $state<Route>({ name: 'dashboard' });
	let search = $state('');

	const go: (r: Route) => void = (r) => (route = r);

	$effect(() => {
		const off = crm.store.subscribe(() => {
			model = crm.store.getModel();
		});
		return off;
	});

	const tabs = [
		{ name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ name: 'pipeline', label: 'Pipeline', icon: Kanban },
		{ name: 'clients', label: 'Clients', icon: Users },
		{ name: 'projects', label: 'Projects', icon: FolderKanban },
	] as const;

	const activeProjects = $derived(
		model.projects.filter((p) => !['completed', 'cancelled'].includes(p.status)).length,
	);

	const activeClient = $derived.by(() => {
		if (route.name !== 'client') return undefined;
		const path = route.path;
		return model.clients.find((c) => c.path === path);
	});

	const activeProject = $derived.by(() => {
		if (route.name !== 'project') return undefined;
		const path = route.path;
		return model.projects.find((p) => p.path === path);
	});

	const activeDeal = $derived.by(() => {
		if (route.name !== 'deal') return undefined;
		const path = route.path;
		return model.deals.find((d) => d.path === path);
	});
</script>

<div class="app-root bg-background text-foreground flex h-full flex-col overflow-hidden">
	<header class="border-border bg-card flex items-center gap-4 border-b px-7 py-3">
		<div class="flex flex-1 flex-col">
			<span class="text-foreground text-lg font-bold leading-tight">CRM</span>
			<span class="text-muted-foreground text-xs">
				{model.clients.length} clients · {activeProjects} active projects
			</span>
		</div>

		<nav class="border-border bg-secondary/40 flex shrink-0 items-center gap-1 rounded-xl border p-1">
			{#each tabs as tab (tab.name)}
				{@const Icon = tab.icon}
				{@const active = route.name === tab.name}
				<button type="button" class={cn('crm-tab', active && 'is-active')} onclick={() => go({ name: tab.name })}>
					<Icon class="size-4" />
					{tab.label}
				</button>
			{/each}
		</nav>

		<div class="flex flex-1 items-center justify-end gap-2.5">
			<div class="relative">
				<Search class="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
				<Input bind:value={search} placeholder="Search" class="h-9 w-52 pl-8" />
			</div>
			<Button size="sm" class="h-9" onclick={() => crm.openModal('new-client', {})}>
				<Plus data-icon="inline-start" /> New
			</Button>
		</div>
	</header>

	<Toaster position="bottom-right" />

	<main class="flex-1 overflow-auto p-7">
		{#if route.name === 'dashboard'}
			<Dashboard {model} {go} />
		{:else if route.name === 'pipeline'}
			<Pipeline {model} {go} />
		{:else if route.name === 'clients'}
			<Clients {model} {search} {go} />
		{:else if route.name === 'client'}
			{#if activeClient}
				<ClientDetail client={activeClient} {go} />
			{:else}
				<p class="text-muted-foreground text-sm">Client not found.</p>
			{/if}
		{:else if route.name === 'projects'}
			<Projects {model} {search} {go} />
		{:else if route.name === 'project'}
			{#if activeProject}
				<ProjectDetail project={activeProject} {model} {go} />
			{:else}
				<p class="text-muted-foreground text-sm">Project not found.</p>
			{/if}
		{:else if route.name === 'deal'}
			{#if activeDeal}
				<DealDetail deal={activeDeal} {model} {go} />
			{:else}
				<p class="text-muted-foreground text-sm">Deal not found.</p>
			{/if}
		{/if}
	</main>
</div>
