<script lang="ts">
	import type { CrmModel, Project, ProjectStatus } from '../../crm/types';
	import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '../../crm/types';
	import type { Go } from '../router';
	import { getCrm } from '../context';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { statusHue } from '$lib/status';
	import { toast } from 'svelte-sonner';

	let { project, model, go }: { project: Project; model: CrmModel; go: Go } = $props();
	const crm = getCrm();

	const tasks = $derived(project.tasks);
	const statusOptions = PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }));

	const details = $derived([
		['Service', project.service],
		['Budget', project.budget ? `${project.budget.toLocaleString()} ${project.currency}` : '—'],
		['Payment terms', project.paymentTerms],
		['Start', project.startDate],
		['Deadline', project.dueDate],
	] as const);

	let newTask = $state('');

	function openClient() {
		const c = model.clients.find((x) => x.name === project.client);
		if (c) go({ name: 'client', path: c.path });
	}

	async function toggleMilestone(index: number, done: boolean) {
		const milestones = project.milestones.map((m, i) => (i === index ? { ...m, done } : m));
		await crm.store.updateProject(project.path, { milestones });
	}

	async function addTask() {
		if (!newTask.trim()) return;
		await crm.store.addTask(project.path, newTask.trim());
		newTask = '';
	}

	async function remove() {
		await crm.store.deleteProject(project);
		toast.success(`Deleted ${project.name}`);
		go({ name: 'projects' });
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-start justify-between">
		<div class="flex flex-col gap-1">
			<Button variant="link" size="sm" class="text-muted-foreground h-auto w-fit p-0" onclick={() => go({ name: 'projects' })}>
				← Projects
			</Button>
			<h1 class="text-foreground text-xl font-semibold">{project.name}</h1>
			<div class="flex items-center gap-2 text-sm">
				{#if project.client}
					<button class="text-primary hover:underline" onclick={openClient}>{project.client}</button>
				{/if}
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Select.Root type="single" value={project.status} onValueChange={(v) => v && crm.store.updateProject(project.path, { status: v as ProjectStatus })}>
				<Select.Trigger class="w-40">{PROJECT_STATUS_LABELS[project.status]}</Select.Trigger>
				<Select.Content>
					{#each statusOptions as o (o.value)}
						<Select.Item value={o.value} label={o.label} />
					{/each}
				</Select.Content>
			</Select.Root>
			<Button size="sm" variant="outline" onclick={() => crm.openModal('new-project', { project })}>Edit</Button>
			<Button size="sm" variant="outline" onclick={() => crm.openNote(project.path)}>Open note</Button>
			<Button size="sm" variant="destructive" onclick={remove}>Delete</Button>
		</div>
	</div>

	<Card.Root class="gap-2 p-4">
		<div class="flex items-center justify-between text-sm">
			<span class="text-muted-foreground">Progress <span class="text-[11px]">· auto from tasks</span></span>
			<span class="text-foreground font-mono">{project.progress}%</span>
		</div>
		<div class="bg-muted h-2 overflow-hidden rounded-full">
			<div class="bg-primary h-full rounded-full" style="width: {Math.max(0, Math.min(100, project.progress))}%; background-color: {statusHue(project.status)};"></div>
		</div>
	</Card.Root>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root class="p-4">
			<Card.Header class="p-0"><Card.Title>Details</Card.Title></Card.Header>
			<Card.Content class="p-0">
				<dl class="grid grid-cols-2 gap-y-2 text-sm">
					{#each details as [term, value] (term)}
						<dt class="text-muted-foreground">{term}</dt>
						<dd class="text-foreground">{value || '—'}</dd>
					{/each}
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root class="p-4">
			<Card.Header class="p-0"><Card.Title>Milestones</Card.Title></Card.Header>
			<Card.Content class="p-0">
				{#if project.milestones.length}
					<div class="flex flex-col gap-2">
						{#each project.milestones as m, i (m.title + i)}
							<label class="flex items-center gap-2 text-sm">
								<Checkbox checked={m.done} onCheckedChange={(v) => toggleMilestone(i, v === true)} />
								<span class="text-foreground" class:line-through={m.done}>{m.title}</span>
							</label>
						{/each}
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">No milestones. Add a `milestones` list in the note frontmatter.</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root class="p-4">
		<Card.Header class="p-0"><Card.Title>Tasks</Card.Title></Card.Header>
		<Card.Content class="flex flex-col gap-3 p-0">
			{#if tasks.length}
				<div class="flex flex-col gap-2">
					{#each tasks as task (task.name)}
						<div class="text-sm">
							<div class="flex items-center gap-2">
								<Checkbox checked={task.done} onCheckedChange={(v) => crm.store.toggleTask(task, v === true)} />
								<span class="text-foreground" class:line-through={task.done}>{task.description}</span>
							</div>
							{#if task.notes}<p class="text-muted-foreground mt-0.5 pl-6 text-xs whitespace-pre-wrap">{task.notes}</p>{/if}
						</div>
					{/each}
				</div>
			{/if}
			<div class="flex gap-2">
				<Input bind:value={newTask} placeholder="Add a task" onkeydown={(e) => e.key === 'Enter' && addTask()} />
				<Button size="sm" variant="outline" disabled={!newTask.trim()} onclick={addTask}>Add</Button>
			</div>
		</Card.Content>
	</Card.Root>

	{#if project.notes}
		<Card.Root class="p-4">
			<Card.Header class="p-0"><Card.Title>Scope &amp; notes</Card.Title></Card.Header>
			<Card.Content class="p-0">
				<p class="text-foreground text-sm whitespace-pre-wrap">{project.notes}</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
