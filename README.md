# CRM

A client and project CRM that lives inside Obsidian. Every client, project, interaction, and task is a plain markdown note in your vault, and the dashboard just reads and writes those notes. The interface follows your installed Obsidian theme and recolors with light and dark mode.

By [Abdulkader Safi](https://abdulkadersafi.com).

## What it does

- A dashboard with a pipeline funnel, follow-ups due this week, a revenue snapshot, recent activity, and an active projects table.
- A clients list with status filtering and search, and a client detail screen with the deal, contacts, interaction history, action items, and linked projects.
- Modals to add a client, log an interaction, and delete a client with a cascade warning.
- Everything is stored as markdown, so your data stays yours: it works with Obsidian links, search, and the graph, and outlives the plugin.

## How data is stored

You pick one CRM folder in the settings (default `CRM`). The plugin reads and writes everything under it, creating typed subfolders as needed:

```
CRM/
  Clients/        CoolPeak AC.md
  Projects/       Horizon Events Website.md
  Interactions/   2026-06-21 CoolPeak AC - Follow-up call.md
  Tasks/          Send proposal.md
```

Each note carries a `crm` field in its frontmatter (`client`, `project`, `interaction`, or `task`) and links to its parents with wikilinks. Structured fields live in frontmatter; the note body stays free for your own notes.

```yaml
---
crm: client
status: lead # lead | proposal | negotiating | active | onhold | completed | lost
company: CoolPeak AC
service: Website redesign
value: 1500
currency: KWD
email: name@company.com
nextFollowUp: 2026-07-02
---
Free notes about the client.
```

The dashboard rebuilds its view whenever a note in the folder changes, so editing a note by hand updates the CRM, and using the CRM updates the notes.

## Use it

1. Build the plugin (see below) or copy `main.js`, `manifest.json`, and `styles.css` into `VaultFolder/.obsidian/plugins/obsidian-crm-plugin/`.
2. Enable **CRM** in **Settings → Community plugins**.
3. Open the plugin settings and set your CRM folder and default currency.
4. Open the CRM from the ribbon contact icon or the **Open view** command.

## Develop

Install and build with [bun](https://bun.sh).

```bash
bun install      # install dependencies
bun run dev      # compile JS and CSS in watch mode
bun run build    # type-check, then production build
bun run test     # run the unit tests
bun run lint     # lint with ESLint
```

`bun run dev` runs two watchers: esbuild compiles `src/main.ts` to `main.js`, and the Tailwind CLI compiles `src/styles.css` to `styles.css`. Reload Obsidian to pick up changes.

For local testing, develop inside your vault at `VaultFolder/.obsidian/plugins/obsidian-crm-plugin/`.

## How it is built

- TypeScript plugin entry (`src/main.ts`) handling the lifecycle: settings, the view, the ribbon icon, the command, and vault change events.
- A data layer in `src/crm/`: domain types, frontmatter helpers, a pure note indexer, and a `CrmStore` that reads and writes notes through a vault adapter. The pure logic is covered by unit tests (`bun run test`).
- A Svelte 5 app in `src/ui/` mounted into an Obsidian `ItemView`, with a small router and screens for the dashboard, clients, and client detail.
- UI built from [shadcn-svelte](https://shadcn-svelte.com) components under `src/ui/lib/components/`, added with the shadcn-svelte CLI.

## How the styling works

Tailwind's Preflight reset is left out so Tailwind does not override Obsidian's own UI. The Svelte app mounts into an `.app-root` element, and shadcn-svelte's tokens (`--primary`, `--background`, and so on) are mapped onto Obsidian's theme variables in `src/styles.css`. Because they resolve at runtime, switching theme or light and dark mode recolors every component with no rebuild. Components that render in a portal (dropdowns, popovers) are themed through the same tokens. Status colors (lead through lost) are a small fixed palette tinted to read on any surface.

Type checking uses `svelte-check` so the build understands Svelte components and their exports.

## Release

- Bump `version` in `manifest.json` (Semantic Versioning) and update `versions.json` to map plugin version to minimum app version.
- Push a tag that exactly matches the `manifest.json` version, with no leading `v`. The release workflow builds the plugin and creates a draft GitHub release with `main.js`, `manifest.json`, and `styles.css` attached.
- Publish the draft release.

## Funding

If this plugin is useful, you can support the work at [ko-fi.com/abdulkadersafi](https://ko-fi.com/abdulkadersafi).

## License

Released under the 0BSD license. See [LICENSE](LICENSE).

## References

- [Obsidian API docs](https://docs.obsidian.md)
- [Svelte](https://svelte.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn-svelte](https://shadcn-svelte.com)
