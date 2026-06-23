<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { Button } from '../lib/components/ui/button';

	let {
		store,
		close,
		clientPath,
	}: { store: CrmStore; close: () => void; clientPath: string } = $props();

	const client = store.getModel().clients.find((c) => c.path === clientPath);
	let deleting = $state(false);

	async function confirm() {
		if (!client || deleting) return;
		deleting = true;
		try {
			await store.deleteClient(client);
			close();
		} finally {
			deleting = false;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<h2 class="text-foreground text-base font-semibold">Delete {client?.name ?? 'client'}?</h2>
	<p class="text-muted-foreground text-sm">
		This removes the client note and everything linked to it. This can't be undone.
	</p>
	{#if client}
		<div class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
			{#if client.projects.length}<p>Also deletes {client.projects.length} project(s)</p>{/if}
			{#if client.interactions.length}<p>Also deletes {client.interactions.length} logged interaction(s)</p>{/if}
			{#if client.tasks.length}<p>Also deletes {client.tasks.length} task(s)</p>{/if}
		</div>
	{/if}
	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button variant="destructive" size="sm" disabled={deleting} onclick={confirm}>Delete client</Button>
	</div>
</div>
