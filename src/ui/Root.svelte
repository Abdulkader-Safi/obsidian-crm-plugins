<script lang="ts">
	import App from './App.svelte';
	import { setCrmContext, type CrmContext } from './context';

	let { ctx }: { ctx: CrmContext } = $props();
	setCrmContext(ctx);
</script>

<App />
