# CRM

A lightweight CRM that lives inside Obsidian. Track clients, deals, and projects, log every interaction, and keep your to-dos, without leaving your vault and without a cloud account.

Every record is a plain markdown note in your vault. The plugin reads and writes those notes, so your data stays yours: it works with Obsidian links, search, and the graph, and it outlives the plugin. The interface follows your installed theme and recolors with light and dark mode.

By [Abdulkader Safi](https://abdulkadersafi.com).

## Features

- **Dashboard** with a deal pipeline funnel, follow-ups due this week (with overdue / due-today flags), a revenue snapshot, recent activity, and your active projects.
- **Pipeline board** of deals you drag between stages (lead, proposal, negotiating, won, lost).
- **Clients, Deals, and Projects** lists with filtering and search, plus a detail page for each.
- **Deals** as first-class opportunities, so one client can have many over time. Repeat business is just a new deal, not a reset.
- **Won a deal? Turn it into a project** in one click, with the link kept between them.
- **Interactions and tasks** logged right inside each note. Project progress is calculated from the tasks you tick off.
- **Tags, bulk actions**, and per-deal / per-client timelines.
- **Follows your theme**: no fixed colors, it adapts to light, dark, and whatever theme you run.
- **Local and offline**: no accounts, no network calls, no telemetry. It only touches notes in the folder you choose.

## Getting started

1. Install **CRM** from **Settings → Community plugins**, then enable it.
2. Open the plugin settings and set your **CRM folder** (default `CRM`) and **default currency**.
3. Open the CRM from the ribbon icon or the **Open view** command.
4. Add a client, add a deal to it, then drag the deal across the pipeline as it progresses. When it is won, convert it to a project.

## How your data is stored

You pick one CRM folder in the settings. The plugin keeps everything under it in typed subfolders, created as needed:

```
CRM/
  Clients/    CoolPeak AC.md
  Deals/      CoolPeak AC - Website redesign.md
  Projects/   Horizon Events Website.md
```

Each note carries a `crm` field in its frontmatter (`client`, `deal`, or `project`) and links to its parents with wikilinks. Structured fields live in frontmatter; the note body is yours.

```yaml
---
crm: deal
client: "[[CoolPeak AC]]"
stage: proposal # lead | proposal | negotiating | won | lost
service: Website redesign
value: 1500
currency: KWD
nextFollowUp: 2026-07-02
---
Notes about this opportunity.
```

**Tasks and interactions live inside the note body**, so they travel with the record:

```markdown
## Tasks
- [ ] Send the proposal
- [x] Kickoff call

## Interactions
- 2026-06-23 | email | Follow up | Sent a follow-up after no reply.
```

Because the CRM is just reading and writing these notes, editing a note by hand updates the CRM, and using the CRM updates the notes. The view refreshes whenever a note in the folder changes.

## How it is modelled

The CRM keeps the account, the sale, and the delivery separate, the way CRMs normally do:

- **Client** is the account. It is never "in the pipeline"; its relationship (prospect, active, past) is worked out from its deals and projects.
- **Deal** is one opportunity with a stage, value, and follow-up. The pipeline board is deals.
- **Project** is the delivery work, usually created from a won deal, with its own status, budget, milestones, and tasks.

## Use it with an AI agent

If you drive your vault with an AI coding agent (Claude Code and similar), open the plugin settings and use **Install AI docs and templates**. It writes a guide and entity templates into `CRM/_docs/` (kept out of the CRM index). Point your agent instructions (for example `CLAUDE.md`) at `CRM/_docs/CRM for AI agents.md`, and the agent can create clients, deals, and projects, log interactions, manage tasks, and answer questions using the documented conventions.

## Settings

- **CRM folder**: where all records are stored.
- **Default currency**: applied to new deals and projects.
- **Install AI docs and templates**: write the agent guide and templates (see above).
- **Migrate clients to deals**: if you used an early version where the client note held the sales stage and value, this moves those fields into a deal per client. Preview first; it never deletes data.

## Privacy

The plugin works entirely on local markdown files in the folder you choose. It makes no network requests, stores nothing outside your vault, and collects no analytics.

## Support

If this plugin is useful, you can support the work at [ko-fi.com/abdulkadersafi](https://ko-fi.com/abdulkadersafi).

## Development

Built with Svelte 5, Tailwind CSS v4, shadcn-svelte, and esbuild. Install and build with [bun](https://bun.sh):

```bash
bun install      # install dependencies
bun run dev      # compile JS and CSS in watch mode
bun run build    # type-check (svelte-check), then production build
bun run test     # run the unit tests
bun run lint     # lint
```

For local testing, work inside a vault at `VaultFolder/.obsidian/plugins/obsidian-crm-plugin/`, then reload Obsidian.

## License

Released under the 0BSD license. See [LICENSE](LICENSE).
