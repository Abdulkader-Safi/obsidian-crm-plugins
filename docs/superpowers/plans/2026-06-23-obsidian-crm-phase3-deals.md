# Obsidian CRM — Phase 3 plan: fix the flow with a Deal entity

Date: 2026-06-23
Status: planning

## Why

Today the **client note is the deal**: `client.status` is a sales pipeline (`lead → … → completed/lost`), the Pipeline board is clients, and a client has one `status`, one `value`, one `service`. That breaks two basics:

1. A client is never "lost" or "closed" — a *deal* is. Marking a client lost buries the whole relationship.
2. Repeat business has no home. Selling a client a website now and a mobile app later forces a bad choice: reset the won client to "lead" (erases history), duplicate the client (splits everything), or make a project (no sales stage, never appears in the pipeline).

This plan separates **Account / Deal / Project** the way CRMs normally do, on top of the existing markdown-note model.

## Target model

| Entity | In pipeline? | Lifecycle | Owns |
|---|---|---|---|
| **Client (account)** | No | derived: prospect / active / past | company, contacts, tags, history |
| **Deal (opportunity)** | **Yes** | `lead → proposal → negotiating → won / lost` | value, service, source, expected close, won/lost reason, follow-up |
| **Project** | No | `discovery → development → review → completed / cancelled` | delivery: budget, milestones, tasks; links to the deal it came from |

- A client has **many deals** over time → repeat business and multiple open opportunities work naturally.
- **Pipeline = open deals.** Won/lost are deal outcomes.
- A **won deal converts to a project** (delivery), keeping a link back to the deal.
- Interactions and tasks link to a client and optionally a deal and/or project.

### Note types (markdown)

New `Deals/` folder. Deal note:

```yaml
---
crm: deal
client: "[[CoolPeak AC]]"
stage: proposal # lead | proposal | negotiating | won | lost
value: 1500
currency: KWD
service: Website redesign
source: Web search
expectedClose: 2026-07-15
nextFollowUp: 2026-07-02
followUpNote: "Send the proposal PDF"
outcomeReason: "" # filled when won or lost
opened: 2026-06-10
---
Free notes about this opportunity.
```

Client note (sales fields removed; account fields kept):

```yaml
---
crm: client
company: CoolPeak AC
industry: AC / HVAC
country: Kuwait
region: ""
email: name@company.com
phone: ""
website: ""
contact: ""
pitchAs: Freelance
tags: [hot-lead]
---
```

Project note gains an optional `deal` link:

```yaml
crm: project
client: "[[CoolPeak AC]]"
deal: "[[CoolPeak AC — Website redesign]]"
status: discovery
...
```

### Derived client relationship (no manual status)

Compute, don't store:
- **active** — has an open deal (`lead|proposal|negotiating`) or a non-completed project.
- **past** — only won/lost deals and no active work.
- **prospect** — no deals yet.

The Clients list shows this derived badge instead of a manual sales status.

## Enums

- `DealStage = 'lead' | 'proposal' | 'negotiating' | 'won' | 'lost'`
- `ProjectStatus` unchanged.
- `ClientStatus` (sales) is **removed** from the client; the value lives on deals as `DealStage`. Keep the status hue/label maps; reuse for deal stages (drop `active`/`onhold`, add `won`).

## Store / logic additions (`src/crm/store.ts`, model, frontmatter)

- `createDeal(input, body)`, `updateDeal(path, patch)`, `setDealStage(path, stage)`, `deleteDeal(deal)` (and detach from projects).
- `convertDealToProject(deal, projectInput)` — creates the project with `deal` + `client` links and sets the deal `stage: won`.
- Indexer: new `Deal` type; attach deals to clients; resolve `project.deal`. Add derived `client.relationship`, `client.openDealValue`, etc. as model helpers (computed in `buildModel`).
- Client write methods drop the sales fields; `clientFrontmatter` no longer writes `status/value/service/leadSource/nextFollowUp/followUpNote` (those move to deal inputs).

TDD all of the above with the fake adapter, mirroring Phase 1/2 tests.

## Migration (one-time, explicit)

A command + settings button **"Migrate clients to deals"**:
1. Dry-run summary first (how many deals will be created).
2. For each `crm: client` note that still has a sales `status`/`value`, create a Deal in `Deals/` carrying `status → stage`, `value`, `service`, `leadSource → source`, `nextFollowUp`, `followUpNote`. Then remove those keys from the client note.
3. Status mapping: `lead/proposal/negotiating → same`; `active → won` (in delivery); `completed → won`; `onhold → negotiating`; `lost → lost`.
4. Idempotent: skip a client that already has a deal. Never deletes data; only moves fields and adds notes.

Until migration runs, the app should still load (treat missing deals as "no deals"; Pipeline shows empty with a "Migrate" prompt if legacy client statuses are detected).

## UI changes

### Pipeline (rework)
- Columns = the five **deal stages**. Cards = deals (client name, service, value). Drag = `setDealStage`.
- Dropping on **won** or **lost** opens a small popover to capture `outcomeReason`; won also offers "Create project".
- Wider columns + horizontal scroll (already done).

### New Deal modal
Fields: client (select), title/service, value, currency, stage, source, expected close, follow-up, notes. Creates the deal. Add a "New deal" action in the header context and on the client detail.

### Client detail
- Replace the single "Deal" panel with a **Deals** section: open deals (stage chip, value, follow-up) + closed deals (won/lost with reason). "New deal" button.
- Keep Contact panel, interactions, tasks, projects, tags.
- The header status becomes the derived relationship badge.

### Deal detail
Either a modal or a route: stage, value, service, source, expected close, follow-up, outcome reason, linked client, linked project, interactions for this deal. Actions: change stage, convert to project, edit, delete.

### Dashboard
- **Pipeline funnel** = open deals by stage; value = sum of open deal value.
- **Finance** = won-deal value (and optionally project budgets for delivery). Compute totals **per currency** (group by `currency`) instead of blindly summing mixed currencies; show the primary currency, list others.
- **Follow-ups this week** = open deals with `nextFollowUp` (reuse the reminder-state pills already built).
- Recent activity + active projects unchanged.

### Won → project flow
From a won deal (drag-to-won, deal detail, or pipeline), offer **Create project**: prefilled New Project modal with client + service + budget from the deal, links `deal`, sets stage won.

## Smaller fixes folded in

- **Won/lost reason** captured on close (deal `outcomeReason`).
- **Currency-aware dashboard** totals (group by currency; no cross-currency sums).
- **Edit Project** full form (New Project modal doubles as editor, like New Client).
- **Edit Interaction** in-app (Log Interaction modal doubles as editor → `updateInteraction`).
- **Search** broadened to clients + deals + projects by name.

## Sequencing

1. **Data layer**: `Deal` type/enum, `dealFrontmatter`, model indexing + derived client relationship, store methods (+ TDD).
2. **Migration** command + settings button (dry-run, idempotent).
3. **Pipeline → deals** with drag, won/lost reason capture.
4. **New Deal modal** + **Client detail Deals section** + **Deal detail**.
5. **Won → project** conversion.
6. **Dashboard** funnel/finance to deals + currency grouping; follow-ups to deals.
7. **Smaller fixes**: edit project/interaction forms, broaden search.
8. **Docs + verification**: update README/AGENTS notes on the model; full build/lint/test; manual vault check including a migration run.

## Risks and guardrails

- **Data migration** is the main risk. Mitigations: dry-run preview, idempotent, never deletes (only moves fields + adds notes), and the app stays usable pre-migration.
- **Scope**: large. Ship behind the sequence above so each step builds and is reviewable; the app keeps working between steps.
- **Backward visibility**: legacy `client.status` is read only by the migration; after migration the client no longer carries it.

## Out of scope (still)

- Multiple contacts per company (separate Contact entity).
- Settings "Record fields" custom-field configurator.
- Invoicing/payments beyond the existing budget/won-value figures.
