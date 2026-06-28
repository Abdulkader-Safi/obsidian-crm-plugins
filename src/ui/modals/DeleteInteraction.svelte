<script lang="ts">
	import type { CrmStore } from '../../crm/store';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

	let {
		store,
		close,
		targetPath,
		index,
		title = '',
	}: { store: CrmStore; close: () => void; targetPath: string; index: number; title?: string } = $props();

	let deleting = $state(false);

	async function confirm() {
		if (deleting) return;
		deleting = true;
		try {
			await store.deleteInteraction(targetPath, index);
			toast.success('Interaction deleted');
			close();
		} finally {
			deleting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1">
		<h2 class="text-foreground text-base font-semibold">Delete interaction?</h2>
		<p class="text-muted-foreground text-sm">
			{title ? `"${title}" will be removed from the note.` : 'This entry will be removed from the note.'} This can't be undone.
		</p>
	</div>

	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" onclick={close}>Cancel</Button>
		<Button variant="destructive" size="sm" disabled={deleting} onclick={confirm}>Delete</Button>
	</div>
</div>
