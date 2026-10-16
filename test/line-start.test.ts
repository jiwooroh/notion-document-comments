import { describe, expect, test } from "vitest";
import { computeLineStartMarkupFixes, insideLineStartMarkup } from "../src/format/line-start";

const apply = (doc: string, changes: Array<{ from: number; to: number; insert: string }>): string => {
	let out = doc;
	for (const c of [...changes].sort((a, b) => b.from - a.from || b.to - a.to))
		out = out.slice(0, c.from) + c.insert + out.slice(c.to);
	return out;
};

describe("comment markers at the start of a line", () => {
	test("move inside bold at the start of a list item", () => {
		const doc = "- **System-level view**\n";
		const from = 2;
		const to = doc.indexOf("\n");
		expect(insideLineStartMarkup(doc, from, to)).toEqual({ from: 4, to: to - 2 });
	});

	test("leave text in the middle of a line alone", () => {
		const doc = "Some **bold** text";
		expect(insideLineStartMarkup(doc, 5, 13)).toEqual({ from: 5, to: 13 });
	});

	test("only move the start when the markup closes earlier", () => {
		const doc = "**bold** and more";
		expect(insideLineStartMarkup(doc, 0, doc.length)).toEqual({ from: 2, to: doc.length });
	});

	test("fix existing comments", () => {
		const doc =
			"- <!--c:ab12c-->**System-level view**<!--/c:ab12c-->\n\n<!--co:ab12c by:lucy status:open\nlucy: hi\n-->\n";
		const fixed = apply(doc, computeLineStartMarkupFixes(doc));
		expect(fixed.split("\n")[0]).toBe("- **<!--c:ab12c-->System-level view<!--/c:ab12c-->**");
		expect(computeLineStartMarkupFixes(fixed)).toEqual([]);
	});

	test("leave comments that don't start a line", () => {
		const doc = "Text <!--c:ab12c-->**bold**<!--/c:ab12c-->\n\n<!--co:ab12c by:lucy status:open\nlucy: hi\n-->\n";
		expect(computeLineStartMarkupFixes(doc)).toEqual([]);
	});
});
