import { describe, expect, test } from "vitest";
import { computeBodyBlankLineFixes } from "../src/format/body-lines";
import { parseComments } from "../src/format/parse";

const apply = (doc: string, changes: Array<{ from: number; to: number; insert: string }>): string => {
	let out = doc;
	for (const c of [...changes].sort((a, b) => b.from - a.from || b.to - a.to))
		out = out.slice(0, c.from) + c.insert + out.slice(c.to);
	return out;
};

describe("empty lines inside comment bodies", () => {
	const doc =
		'Text <!--c:ab1-->here<!--/c:ab1--><!--co:ab1 by:me at:2026-11-24T02:08:00.000Z status:open quote:"here"\n' +
		"me (2026-11-24T02:08:00.000Z): First part.\n\n[Suggestion] second part.\n-->, and more text.\n";

	test("are removed so the comment stays one HTML comment", () => {
		const fixed = apply(doc, computeBodyBlankLineFixes(doc));
		expect(fixed).not.toMatch(/\n[ \t]*\n/);
		expect(fixed).toContain("First part.\n[Suggestion] second part.\n-->, and more text.");
	});

	test("leave the parsed comment unchanged", () => {
		const fixed = apply(doc, computeBodyBlankLineFixes(doc));
		expect(parseComments(fixed).map((c) => c.thread)).toEqual(parseComments(doc).map((c) => c.thread));
	});

	test("nothing to do for bodies without empty lines", () => {
		const clean = "A <!--c:x1-->b<!--/c:x1-->\n<!--co:x1 by:me status:open\nme: hi\n-->\n\nNext paragraph.\n";
		expect(computeBodyBlankLineFixes(clean)).toEqual([]);
	});
});
