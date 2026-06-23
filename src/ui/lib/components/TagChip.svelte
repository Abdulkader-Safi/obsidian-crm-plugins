<script lang="ts" module>
	// Deterministic hue per tag, drawn from the design's tag palette.
	const PALETTE = ['#8A8475', '#2E7D52', '#BC5E27', '#A9791F', '#5E6E7A', '#A53F34', '#3C8C6A'];
	function hueFor(tag: string): string {
		let h = 0;
		for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
		return PALETTE[h % PALETTE.length]!;
	}
</script>

<script lang="ts">
	import X from '@lucide/svelte/icons/x';

	let { tag, onremove }: { tag: string; onremove?: () => void } = $props();
	const hue = $derived(hueFor(tag));
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
	style="background-color: {hue}1f; color: {hue};"
>
	<span class="font-mono opacity-70">#</span>{tag}
	{#if onremove}
		<button type="button" class="ml-0.5 cursor-pointer opacity-70 hover:opacity-100" aria-label="Remove tag" onclick={onremove}>
			<X class="size-3" />
		</button>
	{/if}
</span>
