// Markdown docs and templates installed into <root>/_docs so an AI agent
// (Claude Code, etc.) working in the vault can learn the CRM conventions and
// create/log/search records correctly. The _docs folder is excluded from
// indexing, so templates never appear as real records.

export interface DocFile {
	path: string;
	content: string;
}

function guide(root: string): string {
	return `# CRM for AI agents

This vault contains a CRM managed by the **CRM** Obsidian plugin. Every record is a plain
markdown note. You (an AI agent) can read and write these notes directly. This file is the
contract: follow it so the plugin keeps working and the data stays consistent.

The CRM root folder is \`${root}/\`. Everything below is relative to it.

## Entities

| Entity | Folder | What it is |
|--------|--------|-----------|
| Client | \`Clients/\` | The account (a company or person). Persistent. Never has a sales stage. |
| Deal | \`Deals/\` | One opportunity with a client. Lives in the pipeline. A client can have many. |
| Project | \`Projects/\` | Delivery work, usually created from a won deal. |

Interactions and tasks are **not** separate files. They live inside the body of the
relevant note (see below).

Each note has a \`crm:\` field in its frontmatter that identifies its type
(\`client\`, \`deal\`, or \`project\`). The note's **filename is its identity**. Links between
notes use wikilinks, e.g. \`client: "[[CoolPeak AC]]"\`.

## Frontmatter schema

### Client (\`Clients/<name>.md\`)
\`\`\`yaml
---
crm: client
company: ""
industry: ""
country: ""
region: ""
currency: KWD
email: ""
phone: ""
website: ""
contact: ""        # primary contact name
pitchAs: ""        # e.g. Freelance, your agency
tags: []           # free-form labels, e.g. [hot-lead, hvac]
---
\`\`\`
Clients hold **no** sales fields (no status, value, or service). Those belong to deals.

### Deal (\`Deals/<client> - <service>.md\`)
\`\`\`yaml
---
crm: deal
client: "[[CoolPeak AC]]"
stage: lead        # lead | proposal | negotiating | won | lost
value: 0
currency: KWD
service: ""
source: ""         # where the lead came from
expectedClose: ""  # YYYY-MM-DD
nextFollowUp: ""    # YYYY-MM-DD, drives the dashboard follow-ups
followUpNote: ""
outcomeReason: ""   # fill in when won or lost
opened: ""          # YYYY-MM-DD
---
\`\`\`

### Project (\`Projects/<name>.md\`)
\`\`\`yaml
---
crm: project
client: "[[CoolPeak AC]]"
deal: "[[CoolPeak AC - Website redesign]]"   # the deal it came from (optional)
status: discovery  # discovery | development | review | completed | cancelled
service: ""
budget: 0
currency: KWD
startDate: ""      # YYYY-MM-DD
dueDate: ""        # YYYY-MM-DD
paymentTerms: ""
milestones:
  - title: Discovery
    done: false
---
\`\`\`
Project **progress is derived**, not stored: it is the share of completed tasks (then
milestones). Do not invent a \`progress\` number.

## Inline tasks and interactions

These live in the note body, after the free notes / comment, under fixed headings.

\`\`\`markdown
Free notes about this record (shown as the comment).

## Tasks
- [ ] Send the proposal
  Optional notes for the task, indented under it.
- [x] Kickoff call

## Interactions
- 2026-06-23 | email | Follow up | Sent a follow-up after no reply.
- 2026-06-20 | call | Intro call | Discussed scope.
\`\`\`

- A **task** is a checkbox line under \`## Tasks\`: \`- [ ] text\` (open) or \`- [x] text\` (done).
  Indented lines under it are that task's notes.
- An **interaction** is a bullet under \`## Interactions\` in this exact pipe format:
  \`- DATE | TYPE | TITLE | SUMMARY\`. TYPE is one of \`call\`, \`meeting\`, \`email\`,
  \`followup\`, \`note\`. DATE is \`YYYY-MM-DD\`.
- Tasks belong on **projects** and **clients**. Interactions belong on **deals** and
  **clients** (and projects if useful). A client's timeline aggregates its own
  interactions plus those of its deals and projects.

## How to do common things

**Create a client**: write \`Clients/<Name>.md\` with the client frontmatter. Name it after
the company or person.

**Create a deal**: write \`Deals/<Client> - <Service>.md\` with the deal frontmatter and
\`client: "[[<Client>]]"\`. New deals usually start at \`stage: lead\`.

**Log an interaction**: append one bullet under \`## Interactions\` in the relevant note
(the deal if it is about a specific opportunity, otherwise the client). Create the
\`## Interactions\` heading if it is missing.

**Add a task**: append \`- [ ] <text>\` under \`## Tasks\` in the project or client note.
Mark it done by changing \`[ ]\` to \`[x]\`.

**Win a deal**: set \`stage: won\` and fill \`outcomeReason\`. Then create a project from it
(\`Projects/<name>.md\` with \`deal: "[[<deal name>]]"\` and \`client:\` set).

**Lose a deal**: set \`stage: lost\` and fill \`outcomeReason\`.

## How to answer questions / search

- **Open pipeline**: deals with \`stage\` in \`lead | proposal | negotiating\`.
- **A client's deals/projects**: notes whose \`client:\` wikilink points to that client.
- **Follow-ups due**: open deals with a \`nextFollowUp\` date on or before the target day.
- **Revenue won**: sum \`value\` of deals with \`stage: won\` (group by \`currency\`; never sum
  across different currencies).
- **Project progress**: completed tasks / total tasks in that project's body.

## Rules

- Keep sales data on deals, not clients. A client is just the account.
- One client can have many deals over time (repeat business is a new deal, not a reset).
- Do not create \`Interactions/\` or \`Tasks/\` files. They are inline now.
- Keep \`currency\` consistent within a client's deals where possible.
- Filenames are identity; renaming a note renames the record.
- Templates live in \`_docs/Templates/\`. The \`_docs/\` folder is ignored by the CRM, so
  copy a template out into the right folder before filling it in.
`;
}

function clientTemplate(): string {
	return `---
crm: client
company: ""
industry: ""
country: ""
region: ""
currency: KWD
email: ""
phone: ""
website: ""
contact: ""
pitchAs: ""
tags: []
---
Notes about this client.

## Interactions
- 2026-01-01 | note | Created | Account created.
`;
}

function dealTemplate(): string {
	return `---
crm: deal
client: "[[Client name]]"
stage: lead
value: 0
currency: KWD
service: ""
source: ""
expectedClose: ""
nextFollowUp: ""
followUpNote: ""
outcomeReason: ""
opened: ""
---
What this opportunity is about.

## Interactions
- 2026-01-01 | email | First outreach | Sent intro.
`;
}

function projectTemplate(): string {
	return `---
crm: project
client: "[[Client name]]"
deal: "[[Deal name]]"
status: discovery
service: ""
budget: 0
currency: KWD
startDate: ""
dueDate: ""
paymentTerms: ""
milestones:
  - title: Discovery
    done: false
  - title: Build
    done: false
---
Scope and notes for this project.

## Tasks
- [ ] First task

## Interactions
`;
}

export function agentDocs(root: string): DocFile[] {
	const base = `${root}/_docs`;
	return [
		{ path: `${base}/CRM for AI agents.md`, content: guide(root) },
		{ path: `${base}/Templates/Client.md`, content: clientTemplate() },
		{ path: `${base}/Templates/Deal.md`, content: dealTemplate() },
		{ path: `${base}/Templates/Project.md`, content: projectTemplate() },
	];
}
