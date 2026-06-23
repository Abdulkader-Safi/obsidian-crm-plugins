<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	let {
		store,
		close,
		clientPath,
	}: { store: CrmStore; close: () => void; clientPath: string } = $props();

	// svelte-ignore state_referenced_locally
	const client = store.getModel().clients.find((c) => c.path === clientPath);
	let deleting = $state(false);

	async function confirm() {
		if (!client || deleting) return;
		deleting = true;
		try {
			await store.deleteClient(client);
			toast.success(`Deleted ${client.name}`);
			close();
		} finally {
			deleting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-foreground text-base font-semibold">Delete {client?.name ?? 'client'}?</h2>
		<p class="text-muted-foreground text-sm">
			This removes the client note and everything linked to it. This can't be undone.
		</p>
	</div>

	{#if client && (client.projects.length || client.interactions.length || client.tasks.length)}
		<Alert.Root variant="destructive">
			<Alert.Description>
				{#if client.projects.length}<div>Also deletes {client.projects.length} project(s)</div>{/if}
				{#if client.interactions.length}<div>Also deletes {client.interactions.length} logged interaction(s)</div>{/if}
				{#if client.tasks.length}<div>Also deletes {client.tasks.length} task(s)</div>{/if}
			</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button variant="destructive" size="sm" disabled={deleting} onclick={confirm}>Delete client</Button>
	</div>
</div>
