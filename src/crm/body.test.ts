import { test, expect, describe } from 'bun:test';
import { splitBody, appendTask, appendInteraction, setTaskDone } from './body';

const BODY = `This is the deal comment.
Multiple lines.

## Tasks
- [ ] Send proposal
  Follow the template
- [x] Kickoff call

## Interactions
- 2026-06-23 | email | Follow up | Sent a follow-up after no reply.
- 2026-06-20 | call | Intro call | Discussed scope.`;

describe('splitBody', () => {
	test('separates notes, tasks, and interactions', () => {
		const r = splitBody(BODY);
		expect(r.notes).toBe('This is the deal comment.\nMultiple lines.');
		expect(r.tasks).toHaveLength(2);
		expect(r.tasks[0]).toMatchObject({ text: 'Send proposal', done: false, notes: 'Follow the template', index: 0 });
		expect(r.tasks[1]).toMatchObject({ text: 'Kickoff call', done: true, index: 1 });
		expect(r.interactions).toHaveLength(2);
		expect(r.interactions[0]).toMatchObject({ date: '2026-06-23', type: 'email', title: 'Follow up', summary: 'Sent a follow-up after no reply.' });
	});

	test('a plain note with no sections is all notes', () => {
		const r = splitBody('Just a comment.');
		expect(r.notes).toBe('Just a comment.');
		expect(r.tasks).toHaveLength(0);
		expect(r.interactions).toHaveLength(0);
	});
});

describe('appendTask', () => {
	test('adds a checkbox under Tasks, creating the section if absent', () => {
		const out = appendTask('Comment.', 'New task');
		expect(out).toContain('## Tasks');
		expect(out).toContain('- [ ] New task');
		expect(splitBody(out).tasks).toHaveLength(1);
	});
	test('appends under an existing Tasks section', () => {
		const out = appendTask(BODY, 'Another');
		const tasks = splitBody(out).tasks;
		expect(tasks).toHaveLength(3);
		expect(tasks[2]!.text).toBe('Another');
		// interactions still intact
		expect(splitBody(out).interactions).toHaveLength(2);
	});
});

describe('appendInteraction', () => {
	test('adds a bullet under Interactions', () => {
		const out = appendInteraction('Comment.', { date: '2026-06-24', type: 'meeting', title: 'Demo', summary: 'Showed the prototype.' });
		const ints = splitBody(out).interactions;
		expect(ints).toHaveLength(1);
		expect(ints[0]).toMatchObject({ date: '2026-06-24', type: 'meeting', title: 'Demo', summary: 'Showed the prototype.' });
	});
});

describe('setTaskDone', () => {
	test('toggles the nth task checkbox', () => {
		const out = setTaskDone(BODY, 0, true);
		expect(splitBody(out).tasks[0]!.done).toBe(true);
		const out2 = setTaskDone(BODY, 1, false);
		expect(splitBody(out2).tasks[1]!.done).toBe(false);
	});
});
