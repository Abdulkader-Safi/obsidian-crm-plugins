<script lang="ts">
	import { Label } from "$lib/components/ui/label/index.js";
	import { cn } from "$lib/utils.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: ComponentProps<typeof Label> = $props();
</script>

<Label
	bind:ref
	data-slot="field-label"
	class={cn(
		"gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 *:data-[slot=field]:p-2.5 group/field-label peer/field-label flex w-fit leading-snug",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</Label>
