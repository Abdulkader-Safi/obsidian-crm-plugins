# Obsidian CRM plugin — design

Date: 2026-06-23
Status: approved direction, Phase 1 spec

## Goal

Build a CRM inside Obsidian, following the Pencil design at
`/Users/safi/Documents/Design Files/Obsidian-CRM.pen`. The CRM is a view that
reads from and writes to plain markdown notes in the vault. It must follow the
installed Obsidian theme and recolor automatically when the theme or light/dark
mode changes.

This repo started as the Svelte + Tailwind + shadcn Obsidian plugin template and
is being turned into the CRM plugin.

## Core principles

- **Everything is a markdown note.** Clients, projects, interactions, and tasks
  are each their own `.md` file. The CRM view is only a reader/writer over those
  files. Nothing about the domain data lives in plugin JSON.
- **One root folder, chosen in settings.** The plugin reads and writes
  everything under that folder. It creates typed subfolders on demand.
- **Theme-adaptive.** Layout comes from the design; all color comes from Obsidian
  theme variables already wired in `styles.css`. No hardcoded palette.
- **Native tooling.** Build and install with **bun** (`bun install`,
  `bun run dev`, `bun run build`). This overrides the npm note in AGENTS.md per
  user instruction. `bun.lock` already exists.

## Data model — markdown notes

Settings stores one **CRM root folder**. Under it, typed subfolders, created on
demand:

```
<CRM root>/
  Clients/        CoolPeak AC.md
  Projects/       Horizon Events Website.md
  Interactions/   2026-06-21 CoolPeak AC — Follow-up call.md
  Tasks/          Send proposal.md
```

Every note carries a `crm:` discriminator in YAML frontmatter and links to its
parents with wikilinks. Note bodies stay free-form for the user's own notes.

### Client (`crm: client`)

```yaml
---
crm: client
status: lead            # lead|proposal|negotiating|active|onhold|completed|lost
company: CoolPeak AC
industry: AC / HVAC
country: Kuwait
region: ""
service: Website redesign
value: 1500
currency: KWD
leadSource: Web search
email: name@company.com
phone: ""
website: ""
contact: ""             # primary contact name
pitchAs: Freelance
nextFollowUp: 2026-07-02
followUpNote: ""
---
Free-form notes…
```

The client note filename is the client name. Status drives both the Clients list
pill and (Phase 2) the Pipeline board column.

### Project (`crm: project`)

```yaml
---
crm: project
client: "[[CoolPeak AC]]"
status: discovery       # discovery|development|review|completed|cancelled
progress: 35            # percent
budget: 1500
currency: KWD
startDate: 2026-06-01
dueDate: 2026-07-30
---
```

Full Project screens are Phase 2; the type, folder, and frontmatter exist from
Phase 1 so Client detail can list linked projects.

### Interaction (`crm: interaction`)

```yaml
---
crm: interaction
client: "[[CoolPeak AC]]"
project: "[[Horizon Events Website]]"   # optional
type: email             # call|meeting|email|followup|note
medium: Email
date: 2026-06-21
duration: 0             # minutes
title: Follow-up call
nextAction: ""
---
Summary of what was discussed…
```

One note per logged interaction. The summary lives in the note body.

### Task (`crm: task`)

```yaml
---
crm: task
client: "[[CoolPeak AC]]"   # optional
project: "[[…]]"            # optional
done: false
due: 2026-07-02
---
Task description…
```

One note per action item.

## Architecture

- **`CrmView` (`ItemView`)** mounts the Svelte 5 app into its `contentEl`. Opened
  via a ribbon icon and a command. Unmounts the Svelte app on close.
- **`CrmStore` (plain TS class)** is the data layer:
  - Scans the CRM root folder, reads frontmatter via `app.metadataCache` for
    every note with a `crm:` field, and builds the in-memory model: clients with
    their interactions, tasks, and projects resolved through the wikilinks.
  - Exposes reactive state (Svelte 5 `$state`) the UI reads.
  - Re-indexes on vault `create` / `modify` / `delete` / `rename` events scoped
    to the root folder. All listeners registered with `this.register*` for clean
    unload.
  - Write methods: create/update client, project, interaction, task; toggle task
    done; delete client with cascade (its interactions, tasks, and optionally
    projects). Writes use the Obsidian vault API and
    `app.fileManager.processFrontMatter` where possible.
- **Svelte app** is a small store-driven router. `route` state switches between
  `dashboard | clients | client | pipeline | projects | project`. The `CrmStore`,
  the Obsidian `App`, and the plugin are provided through Svelte context so
  components can open notes, show `Notice`s, and read data.
- **File layout** (keeps `main.ts` thin per AGENTS.md):

  ```
  src/
    main.ts                  # lifecycle only: load settings, register view/ribbon/command/settings
    settings.ts              # CRM root folder + default currency
    crm/
      types.ts               # Client, Project, Interaction, Task, enums
      frontmatter.ts         # parse/serialize helpers, wikilink helpers
      store.ts               # CrmStore: index + read + write + vault events
    ui/
      CrmView.ts             # ItemView host
      App.svelte             # router shell + top nav + search
      context.ts             # Svelte context keys/helpers
      routes/
        Dashboard.svelte
        Clients.svelte
        ClientDetail.svelte
      modals/
        NewClient.svelte
        LogInteraction.svelte
        DeleteConfirm.svelte
      components/            # StatusPill, Card, TableRow, Field, Select, Segmented, etc.
        ...
  ```

## Screens (Phase 1)

### Dashboard

- Pipeline bar: count + value per status across all clients.
- Follow-ups this week: clients whose `nextFollowUp` is within the current week,
  each with a quick "Log" action.
- Finance snapshot: totals derived from client `value` by status (e.g. won vs
  pipeline).
- Recent activity: latest interactions across all clients, newest first.
- Active projects table: projects with status not completed/cancelled, showing
  client, progress, budget.

All figures are derived from the notes; no stored aggregates.

### Clients list

Filterable table of client notes with status pills, service, value, country,
next follow-up. Row click opens Client detail. Filter by status; search by name.

### Client detail

- Header: name, status pill, actions (Log interaction, Edit, Open note).
- Deal panel: status, service, value, lead source, next follow-up.
- Contact panel: email, phone, website, primary contact, country/region.
- Interaction history: interaction notes for this client, newest first.
- Action items: task notes for this client with done toggles.
- Linked projects: project notes whose `client` points here.
- "Open note" reveals the underlying client `.md` in a normal Obsidian pane.

### Modals

Built on Obsidian's `Modal` (native backdrop + ESC) hosting a Svelte form.

- **New Client** — fields grouped Client / Deal / Contact / Follow-up, matching the
  mockup. Required: client name. Creates `Clients/<name>.md`.
- **Log Interaction** — client select, optional project select, title, type
  (segmented: Call/Meeting/Email/Follow-up/Note), medium, date, duration,
  summary, next action. Creates an interaction note; if next action is filled,
  optionally create a task note.
- **Delete confirm** — cascade warning that counts linked projects and
  interactions before deleting the client and its linked notes.

## Theming

- All color via the existing `styles.css` token mapping onto Obsidian variables
  (`bg-background`, `text-foreground`, `bg-primary`, `border`, `bg-secondary`,
  `text-muted-foreground`, `destructive`, etc.). Switching theme or light/dark
  recolors everything with no rebuild.
- Status pills (lead → lost, plus project statuses) use a small fixed semantic
  hue set rendered as tinted background + readable foreground, chosen to read on
  both light and dark surfaces.
- Typography uses the Obsidian UI font, not the mockup's Google fonts, to stay
  native.

## Components

Reuse the existing shadcn `Button`. Add lightweight token-based Tailwind
components: `StatusPill`, `Card`/panel, table row, modal-form shell, form `Field`
/ `TextInput` / `Select`, and a `Segmented` control. All theme automatically.

## Rebrand

- `manifest.json`: `id` → `obsidian-crm-plugin` (matches the folder), update
  `name` and `description`.
- View type, ribbon label, command names updated to the CRM.
- Settings tab: CRM root folder path and default currency.

## Build & verification

- Install/build with bun: `bun install`, `bun run dev`, `bun run build`.
- After Phase 1: run `bun run build`, confirm it compiles, then load in the vault
  to confirm screens render and theme correctly before starting Phase 2.

## Phasing

- **Phase 1 (this spec):** foundation, rebrand, settings, `CrmStore`, Dashboard,
  Clients list, Client detail, the three Phase 1 modals. Project note type exists
  but no Project screens yet.
- **Phase 2:** Pipeline kanban board, Projects list, Project detail, New Project
  modal, project milestones/tasks UI.
- **Phase 3:** polish, edge cases, mobile check.

## Open notes / tradeoffs

- Interaction summaries and task descriptions live in note bodies; structured
  fields in frontmatter. This keeps notes readable and Obsidian-native.
- Indexing reads from `metadataCache`, which is async to populate on first load;
  the store waits for cache readiness before the first full index.
- Wikilink resolution for `client:` / `project:` relies on Obsidian's link
  resolution; renaming a client note updates links via Obsidian's normal
  rename-link behavior, and the store re-indexes on `rename`.
