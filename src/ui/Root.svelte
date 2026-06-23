<script lang="ts">
	import App from './App.svelte';
	import { setCrmContext, type CrmContext } from './context';

	let { ctx }: { ctx: CrmContext } = $props();
	// ctx is provided once at mount and never reassigned.
	// svelte-ignore state_referenced_locally
	setCrmContext(ctx);
</script>

<App />
