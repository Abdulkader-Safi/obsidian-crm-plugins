<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		type = 'text',
	}: { value?: string; placeholder?: string; type?: string } = $props();
</script>

<input
	{type}
	{placeholder}
	bind:value
	class="border-input bg-background text-foreground focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
/>
