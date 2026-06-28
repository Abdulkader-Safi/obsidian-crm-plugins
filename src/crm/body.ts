// Parsing and editing of inline Tasks and Interactions kept inside a note's
// markdown body, so they live with the deal/client/project instead of as
// separate files. The note's free "notes" is everything before the managed
// `## Tasks` / `## Interactions` sections.

const TASKS_RE = /^#{2,4}\s+tasks\s*$/i;
const INTERACTIONS_RE = /^#{2,4}\s+interactions\s*$/i;
const HEADING_RE = /^#{1,6}\s/;
const CHECKBOX_RE = /^\s*- \[([ xX])\]\s?(.*)$/;
const BULLET_RE = /^\s*- (.*)$/;

export interface InlineTask {
	text: string;
	done: boolean;
	notes: string;
	index: number;
}

export interface InlineInteractionRaw {
	date: string;
	type: string;
	title: string;
	summary: string;
	index: number;
}

export interface ParsedBody {
	notes: string;
	tasks: InlineTask[];
	interactions: InlineInteractionRaw[];
}

export function splitBody(body: string): ParsedBody {
	const lines = body.replace(/\r\n/g, '\n').split('\n');
	const notesLines: string[] = [];
	const tasks: InlineTask[] = [];
	const interactions: InlineInteractionRaw[] = [];
	let section: 'none' | 'tasks' | 'interactions' = 'none';
	let curTask: InlineTask | null = null;
	let taskIdx = 0;
	let intIdx = 0;

	const flush = () => {
		if (curTask) curTask.notes = curTask.notes.trim();
		curTask = null;
	};

	for (const line of lines) {
		const t = line.trim();
		if (TASKS_RE.test(t)) {
			flush();
			section = 'tasks';
			continue;
		}
		if (INTERACTIONS_RE.test(t)) {
			flush();
			section = 'interactions';
			continue;
		}
		if (HEADING_RE.test(t)) {
			flush();
			section = 'none';
			notesLines.push(line);
			continue;
		}
		if (section === 'none') {
			notesLines.push(line);
			continue;
		}
		if (section === 'tasks') {
			const m = line.match(CHECKBOX_RE);
			if (m) {
				flush();
				curTask = { text: m[2]!.trim(), done: m[1]!.toLowerCase() === 'x', notes: '', index: taskIdx++ };
				tasks.push(curTask);
			} else if (curTask && t) {
				curTask.notes += (curTask.notes ? '\n' : '') + t;
			}
			continue;
		}
		// interactions
		const m = line.match(BULLET_RE);
		if (m) {
			const parts = m[1]!.split('|').map((s) => s.trim());
			interactions.push({
				date: parts[0] ?? '',
				type: parts[1] ?? '',
				title: parts[2] ?? '',
				summary: parts.slice(3).join(' | ').trim(),
				index: intIdx++,
			});
		}
	}
	flush();
	return { notes: notesLines.join('\n').trim(), tasks, interactions };
}

function appendToSection(body: string, headingRe: RegExp, heading: string, line: string): string {
	const lines = body.replace(/\r\n/g, '\n').split('\n');
	let hIdx = -1;
	for (let i = 0; i < lines.length; i++) {
		if (headingRe.test(lines[i]!.trim())) {
			hIdx = i;
			break;
		}
	}
	if (hIdx === -1) {
		const trimmed = body.replace(/\s+$/, '');
		return `${trimmed ? trimmed + '\n\n' : ''}${heading}\n${line}\n`;
	}
	let end = lines.length;
	for (let i = hIdx + 1; i < lines.length; i++) {
		if (HEADING_RE.test(lines[i]!.trim())) {
			end = i;
			break;
		}
	}
	let insertAt = end;
	while (insertAt - 1 > hIdx && lines[insertAt - 1]!.trim() === '') insertAt--;
	lines.splice(insertAt, 0, line);
	return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function appendTask(body: string, text: string): string {
	return appendToSection(body, TASKS_RE, '## Tasks', `- [ ] ${text}`);
}

function interactionLine(r: Omit<InlineInteractionRaw, 'index'>): string {
	return `- ${r.date} | ${r.type} | ${r.title}${r.summary ? ` | ${r.summary}` : ''}`;
}

export function appendInteraction(body: string, r: Omit<InlineInteractionRaw, 'index'>): string {
	return appendToSection(body, INTERACTIONS_RE, '## Interactions', interactionLine(r));
}

/** Walk the Interactions section and run `op` on the bullet at the given parse index. */
function editInteractions(
	body: string,
	index: number,
	op: (lines: string[], i: number) => void,
): string {
	const lines = body.replace(/\r\n/g, '\n').split('\n');
	let inSection = false;
	let idx = 0;
	for (let i = 0; i < lines.length; i++) {
		const t = lines[i]!.trim();
		if (INTERACTIONS_RE.test(t)) {
			inSection = true;
			continue;
		}
		if (HEADING_RE.test(t)) inSection = false;
		if (inSection && BULLET_RE.test(lines[i]!)) {
			if (idx === index) {
				op(lines, i);
				break;
			}
			idx++;
		}
	}
	return lines.join('\n');
}

export function setInteraction(body: string, index: number, r: Omit<InlineInteractionRaw, 'index'>): string {
	return editInteractions(body, index, (lines, i) => {
		lines[i] = interactionLine(r);
	});
}

export function removeInteraction(body: string, index: number): string {
	return editInteractions(body, index, (lines, i) => {
		lines.splice(i, 1);
	});
}

export function setTaskDone(body: string, index: number, done: boolean): string {
	const lines = body.replace(/\r\n/g, '\n').split('\n');
	let inTasks = false;
	let idx = 0;
	for (let i = 0; i < lines.length; i++) {
		const t = lines[i]!.trim();
		if (TASKS_RE.test(t)) {
			inTasks = true;
			continue;
		}
		if (HEADING_RE.test(t)) inTasks = false;
		if (inTasks && CHECKBOX_RE.test(lines[i]!)) {
			if (idx === index) {
				lines[i] = lines[i]!.replace(/- \[[ xX]\]/, done ? '- [x]' : '- [ ]');
				break;
			}
			idx++;
		}
	}
	return lines.join('\n');
}
