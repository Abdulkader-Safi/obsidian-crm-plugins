<script lang="ts">
	let {
		value = $bindable(''),
		options,
	}: { value?: string; options: { value: string; label: string }[] } = $props();
</script>

<div class="border-input inline-flex gap-1 rounded-md border p-1">
	{#each options as opt (opt.value)}
		<button
			type="button"
			class="rounded px-2 py-1 text-xs font-medium transition-colors"
			class:bg-primary={value === opt.value}
			class:text-primary-foreground={value === opt.value}
			class:text-muted-foreground={value !== opt.value}
			onclick={() => (value = opt.value)}
		>
			{opt.label}
		</button>
	{/each}
</div>
