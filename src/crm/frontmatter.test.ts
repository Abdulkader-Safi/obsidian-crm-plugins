import { test, expect, describe } from 'bun:test';
import {
	parseWikilink,
	toWikilink,
	noteBasename,
	asNumber,
	asBool,
	clientFrontmatter,
	projectFrontmatter,
} from './frontmatter';

describe('parseWikilink', () => {
	test('extracts target from a wikilink', () => {
		expect(parseWikilink('[[CoolPeak AC]]')).toBe('CoolPeak AC');
	});
	test('strips an alias', () => {
		expect(parseWikilink('[[CoolPeak AC|Cool]]')).toBe('CoolPeak AC');
	});
	test('returns null for empty or missing', () => {
		expect(parseWikilink('')).toBeNull();
		expect(parseWikilink(undefined)).toBeNull();
		expect(parseWikilink(null)).toBeNull();
	});
	test('accepts a bare name', () => {
		expect(parseWikilink('CoolPeak AC')).toBe('CoolPeak AC');
	});
});

describe('toWikilink', () => {
	test('wraps a name', () => {
		expect(toWikilink('CoolPeak AC')).toBe('[[CoolPeak AC]]');
	});
});

describe('noteBasename', () => {
	test('strips folders and extension', () => {
		expect(noteBasename('CRM/Clients/CoolPeak AC.md')).toBe('CoolPeak AC');
	});
});

describe('coercion', () => {
	test('asNumber parses numbers and strings, defaults 0', () => {
		expect(asNumber(1500)).toBe(1500);
		expect(asNumber('1500')).toBe(1500);
		expect(asNumber(undefined)).toBe(0);
		expect(asNumber('abc')).toBe(0);
	});
	test('asBool reads booleans and strings', () => {
		expect(asBool(true)).toBe(true);
		expect(asBool('true')).toBe(true);
		expect(asBool(undefined)).toBe(false);
	});
});

describe('clientFrontmatter', () => {
	test('builds frontmatter with crm discriminator and defaults', () => {
		const fm = clientFrontmatter({
			name: 'CoolPeak AC',
			status: 'lead',
			value: 1500,
			currency: 'KWD',
		});
		expect(fm.crm).toBe('client');
		expect(fm.status).toBe('lead');
		expect(fm.value).toBe(1500);
		expect(fm.currency).toBe('KWD');
		expect(fm.company).toBe('');
	});
});

describe('projectFrontmatter', () => {
	test('builds project frontmatter with client wikilink', () => {
		const fm = projectFrontmatter({
			name: 'Site',
			clientName: 'CoolPeak AC',
			status: 'discovery',
			currency: 'KWD',
			budget: 900,
		});
		expect(fm.crm).toBe('project');
		expect(fm.status).toBe('discovery');
		expect(fm.client).toBe('[[CoolPeak AC]]');
		expect(fm.budget).toBe(900);
	});
	test('omits client when not provided', () => {
		const fm = projectFrontmatter({ name: 'Site', status: 'discovery', currency: 'USD' });
		expect('client' in fm).toBe(false);
	});
});
