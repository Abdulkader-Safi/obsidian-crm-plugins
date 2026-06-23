<script lang="ts">
	import type { CrmModel } from '../../crm/types';
	import type { Go } from '../router';

	let { model }: { model: CrmModel; go: Go } = $props();
</script>

<p class="text-muted-foreground text-sm">
	{model.clients.length} clients. Dashboard coming in the next task.
</p>
