<script lang="ts">
	let {
		value = $bindable(''),
		options,
	}: { value?: string; options: { value: string; label: string }[] } = $props();
</script>

<select
	bind:value
	class="border-input bg-background text-foreground focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
>
	{#each options as opt (opt.value)}
		<option value={opt.value}>{opt.label}</option>
	{/each}
</select>
