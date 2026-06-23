<script lang="ts">
	import type { Client } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import TagChip from '$lib/components/TagChip.svelte';
	import Plus from '@lucide/svelte/icons/plus';

	let { client, go }: { client: Client; go: Go } = $props();
	const crm = getCrm();

	let newTask = $state('');
	let addingTag = $state(false);
	let newTag = $state('');

	async function addTag() {
		const tag = newTag.trim().replace(/^#/, '');
		newTag = '';
		addingTag = false;
		if (!tag || client.tags.includes(tag)) return;
		await crm.store.updateClient(client.path, { tags: [...client.tags, tag] });
	}
	async function removeTag(tag: string) {
		await crm.store.updateClient(client.path, { tags: client.tags.filter((t) => t !== tag) });
	}

	const REL_HUE: Record<string, string> = { active: '#2E7D52', prospect: '#8A8475', past: '#5E6E7A' };
	const REL_LABEL: Record<string, string> = { active: 'Active', prospect: 'Prospect', past: 'Past' };
	const relHue = $derived(REL_HUE[client.relationship] ?? '#8A8475');

	function dealMoney(value: number, currency: string): string {
		return value ? `${value.toLocaleString()} ${currency}` : '—';
	}

	const contact = $derived([
		['Email', client.email],
		['Phone', client.phone],
		['Website', client.website],
		['Primary contact', client.contact],
		['Country', client.country],
		['Region', client.region],
	] as const);

	async function addTask() {
		if (!newTask.trim()) return;
		await crm.store.createTask(newTask.trim(), { clientName: client.name });
		newTask = '';
	}
</script>

<div class="flex flex-col gap-4">
	<div>
		<Button variant="link" size="sm" class="text-muted-foreground mb-2 h-auto w-fit p-0" onclick={() => go({ name: 'clients' })}>
			← Clients
		</Button>
		<div class="flex items-start justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class="flex flex-col gap-1">
					<div class="flex items-center gap-2">
						<h1 class="text-foreground text-xl font-semibold">{client.name}</h1>
						<span class="rounded-full px-2 py-0.5 text-xs font-semibold" style="background-color: {relHue}22; color: {relHue};">
							{REL_LABEL[client.relationship]}
						</span>
					</div>
					{#if client.company || client.country}
						<p class="text-muted-foreground text-sm">
							{[client.company, client.country].filter(Boolean).join(' · ')}
						</p>
					{/if}
				</div>
			</div>
			<div class="flex shrink-0 gap-2">
				<Button size="sm" variant="secondary" onclick={() => crm.openModal('log-interaction', { clientName: client.name })}>
					Log interaction
				</Button>
				<Button size="sm" variant="outline" onclick={() => crm.openModal('new-client', { client })}>Edit</Button>
				<Button size="sm" variant="outline" onclick={() => crm.openNote(client.path)}>Open note</Button>
				<Button size="sm" variant="destructive" onclick={() => crm.openModal('delete-client', { clientPath: client.path })}>
					Delete
				</Button>
			</div>
		</div>

		<div class="mt-3 flex flex-wrap items-center gap-2">
			{#each client.tags as tag (tag)}
				<TagChip {tag} onremove={() => removeTag(tag)} />
			{/each}
			{#if addingTag}
				<!-- svelte-ignore a11y_autofocus -->
				<input
					autofocus
					bind:value={newTag}
					placeholder="tag name"
					class="border-input bg-background h-6 w-28 rounded-full border px-2.5 text-xs outline-none"
					onkeydown={(e) => {
						if (e.key === 'Enter') addTag();
						if (e.key === 'Escape') {
							addingTag = false;
							newTag = '';
						}
					}}
					onblur={addTag}
				/>
			{:else}
				<button
					type="button"
					class="border-border text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
					onclick={() => (addingTag = true)}
				>
					<Plus class="size-3" /> Add tag
				</button>
			{/if}
		</div>
	</div>

	<div class="flex flex-col gap-4 lg:flex-row">
		<!-- Left: activity -->
		<div class="flex min-w-0 flex-1 flex-col gap-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title>Deals</Card.Title>
					<Button size="sm" variant="outline" onclick={() => crm.openModal('new-deal', { clientName: client.name })}>
						<Plus data-icon="inline-start" /> New deal
					</Button>
				</Card.Header>
				<Card.Content>
					{#if client.deals.length}
						<div class="flex flex-col gap-1">
							{#each client.deals as d (d.path)}
								<button class="crm-rowbtn -mx-2" onclick={() => crm.openModal('deal-detail', { path: d.path })}>
									<span class="flex min-w-0 flex-1 items-center gap-2">
										<span class="text-foreground truncate text-sm font-medium">{d.service || d.name}</span>
										<StatusBadge status={d.stage} />
									</span>
									<span class="text-foreground shrink-0 font-mono text-[13px]">{dealMoney(d.value, d.currency)}</span>
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">No deals yet.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header><Card.Title>Interaction history</Card.Title></Card.Header>
				<Card.Content>
					{#if client.interactions.length}
						<div class="flex flex-col gap-3">
							{#each client.interactions as it (it.path)}
								<div class="border-border border-b pb-2 last:border-0">
									<button class="crm-rowbtn -mx-2" onclick={() => crm.openModal('interaction-detail', { path: it.path })}>
										<span class="text-foreground flex-1 text-sm font-medium">{it.title}</span>
										<span class="text-muted-foreground shrink-0 font-mono text-xs">{it.date}</span>
									</button>
									{#if it.summary}<p class="text-muted-foreground mt-1 text-sm">{it.summary}</p>{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">No interactions yet.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header><Card.Title>Action items</Card.Title></Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#if client.tasks.length}
						<div class="flex flex-col gap-2">
							{#each client.tasks as task (task.path)}
								<div class="flex items-center gap-2 text-sm">
									<Checkbox checked={task.done} onCheckedChange={(v) => crm.store.toggleTask(task.path, v === true)} />
									<span class="text-foreground" class:line-through={task.done}>{task.description}</span>
									{#if task.due}<span class="text-muted-foreground ml-auto font-mono text-xs">{task.due}</span>{/if}
								</div>
							{/each}
						</div>
					{/if}
					<div class="flex gap-2">
						<Input bind:value={newTask} placeholder="Add an action item" onkeydown={(e) => e.key === 'Enter' && addTask()} />
						<Button size="sm" variant="outline" disabled={!newTask.trim()} onclick={addTask}>Add</Button>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header><Card.Title>Projects</Card.Title></Card.Header>
				<Card.Content>
					{#if client.projects.length}
						<div class="flex flex-col gap-2">
							{#each client.projects as p (p.path)}
								<div class="flex items-center justify-between text-sm">
									<Button variant="link" size="sm" class="h-auto p-0" onclick={() => go({ name: 'project', path: p.path })}>{p.name}</Button>
									<span class="text-muted-foreground flex items-center gap-2 text-xs"><StatusBadge status={p.status} /> {p.progress}%</span>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex items-center justify-between">
							<p class="text-muted-foreground text-sm">No linked projects.</p>
							<Button size="sm" variant="outline" onclick={() => crm.openModal('new-project', { clientName: client.name })}>New project</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right: details -->
		<div class="flex shrink-0 flex-col gap-4 lg:w-[320px]">
			<Card.Root>
				<Card.Header><Card.Title>Contact</Card.Title></Card.Header>
				<Card.Content>
					<dl class="flex flex-col gap-2 text-sm">
						{#each contact as [term, value] (term)}
							<div class="flex justify-between gap-3">
								<dt class="text-muted-foreground">{term}</dt>
								<dd class="text-foreground truncate text-right">{value || '—'}</dd>
							</div>
						{/each}
					</dl>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>
