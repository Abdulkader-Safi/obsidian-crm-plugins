<script lang="ts">
	import type { Client } from '../../crm/types';
	import type { Go } from '../router';

	let { client }: { client: Client; go: Go } = $props();
</script>

<p class="text-muted-foreground text-sm">{client.name} detail coming in the next task.</p>
