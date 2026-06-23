<script lang="ts">
	import { getCrm } from './context';
	import type { Route } from './router';
	import { Button } from './lib/components/ui/button';
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

	const activeClient = $derived(
		route.name === 'client' ? model.clients.find((c) => c.path === route.path) : undefined,
	);
</script>

<div class="app-root bg-background text-foreground flex h-full flex-col overflow-hidden">
	<header class="border-border flex items-center gap-3 border-b px-4 py-2">
		<span class="text-foreground font-semibold">CRM</span>
		<nav class="flex items-center gap-1">
			{#each tabs as tab (tab.name)}
				<button
					class="rounded px-3 py-1 text-sm transition-colors"
					class:bg-secondary={route.name === tab.name}
					class:text-foreground={route.name === tab.name}
					class:text-muted-foreground={route.name !== tab.name}
					onclick={() => go({ name: tab.name })}
				>
					{tab.label}
				</button>
			{/each}
		</nav>
		<div class="ml-auto flex items-center gap-2">
			<input
				bind:value={search}
				placeholder="Search clients"
				class="border-input bg-background h-8 rounded-md border px-3 text-sm outline-none"
			/>
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
