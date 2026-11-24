import { describe, expect, test } from "vitest";
import { computeBodyLayoutFixes } from "../src/format/body-lines";
import { parseComments } from "../src/format/parse";

const apply = (doc: string, changes: Array<{ from: number; to: number; insert: string }>): string => {
	let out = doc;
	for (const c of [...changes].sort((a, b) => b.from - a.from || b.to - a.to))
		out = out.slice(0, c.from) + c.insert + out.slice(c.to);
	return out;
};

const comments = (doc: string) => parseComments(doc).map((c) => ({ id: c.id, quote: c.quote, thread: c.thread }));

describe("comment bodies that break Reading view", () => {
	test("empty lines inside a body are removed", () => {
		const doc =
			'Text <!--c:ab1-->here<!--/c:ab1--><!--co:ab1 by:me status:open quote:"here"\n' +
			"me (2026-11-24T02:08:00.000Z): First part.\n\n[Suggestion] second part.\n-->, and more text.\n";
		const fixed = apply(doc, computeBodyLayoutFixes(doc));
		expect(fixed).toBe(
			'Text <!--c:ab1-->here<!--/c:ab1--><!--co:ab1 by:me status:open quote:"here"\n' +
				"me (2026-11-24T02:08:00.000Z): First part.\n[Suggestion] second part.\n-->, and more text.\n",
		);
		expect(comments(fixed)).toEqual(comments(doc));
	});

	test("a multi-line body on a line that starts with a marker moves after the paragraph", () => {
		const doc =
			"Intro.\n\n" +
			"<!--c:p1-->Start<!--/c:p1--><!--co:p1 by:me status:open\nme: one\n--> and the rest, <!--c:p2-->more<!--/c:p2--><!--co:p2 by:me status:open\nme: two\n--> end.\n\nNext.\n";
		const fixed = apply(doc, computeBodyLayoutFixes(doc));
		expect(fixed).toBe(
			"Intro.\n\n" +
				"<!--c:p1-->Start<!--/c:p1--> and the rest, <!--c:p2-->more<!--/c:p2--> end.\n" +
				"<!--co:p1 by:me status:open\nme: one\n-->\n<!--co:p2 by:me status:open\nme: two\n-->\n\nNext.\n",
		);
		expect(comments(fixed)).toEqual(comments(doc));
	});

	test("bodies inline in an ordinary paragraph line stay where they are", () => {
		const doc = "Some <!--c:x1-->b<!--/c:x1--><!--co:x1 by:me status:open\nme: hi\n--> text.\n\nNext paragraph.\n";
		expect(computeBodyLayoutFixes(doc)).toEqual([]);
	});
});
