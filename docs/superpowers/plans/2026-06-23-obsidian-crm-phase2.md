# Obsidian CRM — Phase 2 plan (missing pages, logic, functionality)

Date: 2026-06-23
Status: planning

## Gap analysis (design vs built)

The Pencil file has 14 frames. Status against the current build:

| # | Frame | Type | Status |
|---|-------|------|--------|
| 1 | CRM \| Main View | Dashboard | Built, matches design |
| 2 | CRM \| Clients View | Page | Built (basic table); needs fidelity pass |
| 3 | CRM \| Client Detail | Page | Built (basic); needs fidelity + Edit |
| 4 | CRM — Pipeline Board | Page | **Missing** (placeholder tab) |
| 5 | CRM — Projects List | Page | **Missing** (placeholder tab) |
| 6 | CRM — Project Detail | Page | **Missing** |
| 7 | CRM — Settings | Page | Partial (Obsidian settings tab: folder + currency) |
| 8 | Modal — New Client | Modal | Built |
| 9 | Modal — Log Interaction | Modal | Built |
| 10 | Modal — New Project | Modal | **Missing** |
| 11 | Modal — Delete Confirm | Modal | Built |
| 12 | Modal — Interaction Detail | Modal | **Missing** |
| 13 | CRM — States & Components | Spec | Polish reference (empty/loading/tags/bulk/reminders) |
| 14 | CRM — Popovers & Feedback | Spec | Polish reference (popovers, toasts) |

## Functionality gaps in built screens

- **Client detail has no Edit.** Only create exists. Need an Edit Client modal (reuse the New Client form, prefilled) writing back to the note.
- **No status change** from the UI except by editing the note. Pipeline drag and an inline status control are missing.
- **Interaction history / recent activity rows are not clickable.** Should open the Interaction Detail modal.
- **Clients list and Client detail are below design fidelity** (columns, hero, filters, layout).
- **Header search** filters the Clients list only; fine for now.

## Store / logic additions (`src/crm/store.ts` + adapter)

New methods, all writing markdown notes and re-indexing:

- `updateClient(path, patch)` — patch client frontmatter (used by Edit + status change).
- `setClientStatus(path, status)` — convenience for pipeline drag and status control.
- `createProject(input)` — write `Projects/<name>.md` with `client` wikilink.
- `updateProject(path, patch)` — status, progress, dates, budget.
- `deleteProject(path)` / `deleteInteraction(path)` / `deleteTask(path)`.
- `updateInteraction(path, patch, summary)` — edit a logged interaction.

`ProjectInput` and an `updateFrontmatter`-based path already exist in the adapter; these reuse it. Indexer already resolves projects/interactions/tasks to clients, so no model change is needed beyond reading project milestones (below).

### Milestones (project detail)

Milestones are small and ordered, so store them as a frontmatter array on the project note rather than separate notes:

```yaml
milestones:
  - { title: 'Discovery', done: true }
  - { title: 'Design', done: false }
```

Project tasks reuse the existing Task note type with a `project` wikilink (already supported by the indexer).

## Pages to build

### A. Pipeline Board (`routes/Pipeline.svelte`)
- Seven columns, one per client status, each headed with the status label + count.
- Cards = clients in that stage: name, company, value, next-follow-up chip.
- **Logic:** drag a card to another column → `setClientStatus(path, newStatus)`. Column counts and the dashboard funnel update on reindex.
- Wire the dashboard "Open board" link and the Pipeline tab to this route.
- Drag-and-drop: use native HTML5 drag events (no new dependency).

### B. Projects List (`routes/Projects.svelte`)
- Table: Project, Client, Status (dot), Progress (bar + %), Deadline, Budget. Filter by status; search by name.
- Header "New project" button → New Project modal.
- Row → Project Detail. Wire the Projects tab.

### C. Project Detail (`routes/ProjectDetail.svelte`)
- Hero: project name, status pill, client link, start/deadline, budget, progress bar.
- Cards: Milestones (checklist, toggles write the frontmatter array), Tasks (task notes for this project, with done toggles and an add-task control), Scope / notes (note body), and a details panel (service, payment terms, dates).
- Actions: Edit (New Project form prefilled → `updateProject`), Open note, Delete (cascade its tasks).
- Add a `{ name: 'project'; path }` route; link from Projects list, dashboard active projects, and client detail linked-projects.

### D. New Project modal (`modals/NewProject.svelte`)
Fields from the design: project name (required), client (select), status, service, budget, start date, deadline, payment terms (select), scope notes. Creates the project note via `createProject`. Register under modal key `new-project`.

### E. Interaction Detail modal (`modals/InteractionDetail.svelte`)
- Shows title, type chip, client, project, date, duration, summary, action items (task toggles), next action.
- Actions: Delete (`deleteInteraction`) and Edit (reopen the Log Interaction form prefilled → `updateInteraction`).
- Opened from interaction history rows (Client detail) and recent activity (Dashboard). Modal key `interaction-detail`.

### F. Settings (keep in Obsidian settings tab)
The design's in-app "Record fields" screen is a custom-field configurator (per-field type/options/enabled). That is a large feature and not required for the markdown model. Phase 2 keeps the Obsidian settings tab and adds:
- Editable pipeline stage labels (optional).
- Default currency and folder (already present).
Full custom-field config is deferred (Phase 3+ / optional).

## Fidelity passes (built screens)
- **Clients list:** match the design's hero/filter row and column set; row hover; status pills.
- **Client detail:** match the hero and card layout; add Edit and inline status; make interaction rows open the Interaction Detail modal.

## Suggested sequencing
1. Store logic: `createProject`, `updateClient`/`setClientStatus`, `updateProject`, deletes, `updateInteraction` (+ unit tests, TDD with the fake adapter).
2. New Project modal + Projects List + Project Detail (+ milestones).
3. Pipeline Board with drag-to-restage.
4. Interaction Detail modal + wire history/activity rows; Edit Client.
5. Fidelity passes on Clients list and Client detail.
6. Phase 3 polish: empty states (`Empty`), loading (`Skeleton`), toasts (`svelte-sonner`), tags, bulk actions.

## Notes
- Every page stays data-driven from the markdown notes; colors stay theme-adaptive; components come from shadcn-svelte.
- Drag-and-drop and milestone arrays add no new dependencies.
