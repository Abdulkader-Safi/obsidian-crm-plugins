<script lang="ts">
	import { getCrm } from './context';

	const crm = getCrm();
	let model = $state(crm.store.getModel());

	$effect(() => {
		const off = crm.store.subscribe(() => {
			model = crm.store.getModel();
		});
		return off;
	});
</script>

<div class="app-root bg-background text-foreground h-full overflow-auto p-6">
	<h1 class="mb-2 text-lg font-semibold">CRM</h1>
	<p class="text-muted-foreground text-sm">
		{model.clients.length} clients indexed.
	</p>
</div>
