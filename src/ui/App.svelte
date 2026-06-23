<script lang="ts">
	import { getCrm } from './context';
	import type { Route } from './router';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Clients from './routes/Clients.svelte';
	import Dashboard from './routes/Dashboard.svelte';
	import ClientDetail from './routes/ClientDetail.svelte';

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

	const tabs: { name: 'dashboard' | 'clients'; label: string }[] = [
		{ name: 'dashboard', label: 'Dashboard' },
		{ name: 'clients', label: 'Clients' },
	];

	const activeClient = $derived.by(() => {
		if (route.name !== 'client') return undefined;
		const path = route.path;
		return model.clients.find((c) => c.path === path);
	});
</script>

<div class="app-root bg-background text-foreground flex h-full flex-col overflow-hidden">
	<header class="border-border flex items-center gap-3 border-b px-4 py-2">
		<span class="text-foreground font-semibold">CRM</span>
		<nav class="flex items-center gap-1">
			{#each tabs as tab (tab.name)}
				<Button
					variant={route.name === tab.name ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => go({ name: tab.name })}
				>
					{tab.label}
				</Button>
			{/each}
		</nav>
		<div class="ml-auto flex items-center gap-2">
			<Input bind:value={search} placeholder="Search clients" class="h-8 w-48" />
			<Button size="sm" onclick={() => crm.openModal('new-client', {})}>New client</Button>
		</div>
	</header>

	<main class="flex-1 overflow-auto p-4">
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
		{/if}
	</main>
</div>
