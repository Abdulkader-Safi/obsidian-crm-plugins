<script lang="ts">
	import { getCrm } from './context';
	import type { Route } from './router';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Clients from './routes/Clients.svelte';
	import Dashboard from './routes/Dashboard.svelte';
	import ClientDetail from './routes/ClientDetail.svelte';
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
</script>

<div class="app-root bg-background text-foreground flex h-full flex-col overflow-hidden">
	<header class="border-border bg-card flex items-center gap-6 border-b px-7 py-3">
		<div class="flex flex-col">
			<span class="text-foreground text-lg font-bold leading-tight">CRM</span>
			<span class="text-muted-foreground text-xs">
				{model.clients.length} clients · {activeProjects} active projects
			</span>
		</div>

		<nav class="border-border bg-secondary/40 flex items-center gap-1 rounded-xl border p-1">
			{#each tabs as tab (tab.name)}
				{@const Icon = tab.icon}
				<button
					class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
					class:bg-card={route.name === tab.name}
					class:text-foreground={route.name === tab.name}
					class:shadow-sm={route.name === tab.name}
					class:text-muted-foreground={route.name !== tab.name}
					onclick={() => go({ name: tab.name })}
				>
					<Icon class="size-4 {route.name === tab.name ? 'text-primary' : ''}" />
					{tab.label}
				</button>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-2.5">
			<div class="relative">
				<Search class="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
				<Input bind:value={search} placeholder="Search clients" class="h-9 w-52 pl-8" />
			</div>
			<Button size="sm" class="h-9" onclick={() => crm.openModal('new-client', {})}>
				<Plus data-icon="inline-start" /> New
			</Button>
		</div>
	</header>

	<main class="flex-1 overflow-auto p-7">
		{#if route.name === 'dashboard'}
			<Dashboard {model} {go} />
		{:else if route.name === 'clients'}
			<Clients {model} {search} {go} />
		{:else if route.name === 'client'}
			{#if activeClient}
				<ClientDetail client={activeClient} {go} />
			{:else}
				<p class="text-muted-foreground text-sm">Client not found.</p>
			{/if}
		{:else}
			<div class="text-muted-foreground flex h-full items-center justify-center text-sm">
				{route.name === 'pipeline' ? 'Pipeline board' : 'Projects'} arrives in a later phase.
			</div>
		{/if}
	</main>
</div>
