import type { TextRange } from "./types";
import { parseComments } from "./parse";
import { closeMarker, openMarker } from "./serialize";
import { isCodeComment } from "./code-anchor";

/** What may come before a line's content: indentation, blockquote `>`, a list
 *  marker (with an optional task box), or a heading's `#`s. */
const LINE_PREFIX = /^[ \t]*(?:>[ \t]?)*[ \t]*(?:(?:[-+*]|\d+[.)])[ \t]+(?:\[.\][ \t]+)?)?(?:#{1,6}[ \t]+)?$/;
/** Inline-markup delimiters the anchored text can start with (`**`, `==`, …). */
const LEADING_MARKUP = /^[*_~=]+/;

const reversed = (s: string): string => Array.from(s).reverse().join("");

/**
 * A line whose content starts with `<!--` is an HTML block to Markdown, so
 * nothing else on that line is parsed: a comment on `**bold**` at the start of
 * a list item shows the asterisks literally in Reading view and PDF. When the
 * anchored text sits at the start of a line and begins with markup, move the
 * range inside that markup (and inside the matching closing markup, if it ends
 * with it) so the line starts with `**` instead of the marker. `markerAt` is
 * where the opening marker sits (for an existing comment, before `from`).
 */
export const insideLineStartMarkup = (doc: string, from: number, to: number, markerAt = from): TextRange => {
	const lineStart = doc.lastIndexOf("\n", markerAt - 1) + 1;
	if (!LINE_PREFIX.test(doc.slice(lineStart, markerAt))) return { from, to };
	const text = doc.slice(from, to);
	const lead = LEADING_MARKUP.exec(text)?.[0];
	if (!lead || lead.length >= text.length) return { from, to };
	const trail = reversed(lead);
	const newFrom = from + lead.length;
	const newTo = text.endsWith(trail) && to - trail.length > newFrom ? to - trail.length : to;
	return { from: newFrom, to: newTo };
};

/** Changes that move existing comments' markers inside line-start markup (see
 *  insideLineStartMarkup). Empty when nothing needs fixing. */
export const computeLineStartMarkupFixes = (doc: string): Array<{ from: number; to: number; insert: string }> => {
	const changes: Array<{ from: number; to: number; insert: string }> = [];
	for (const c of parseComments(doc)) {
		if (!c.open || !c.close || isCodeComment(c) || c.close.from <= c.open.to) continue;
		const { from, to } = insideLineStartMarkup(doc, c.open.to, c.close.from, c.open.from);
		if (from === c.open.to && to === c.close.from) continue;
		changes.push({ from: c.open.from, to: c.open.to, insert: "" });
		changes.push({ from, to: from, insert: openMarker(c.id) });
		if (to !== c.close.from) {
			changes.push({ from: to, to, insert: closeMarker(c.id) });
			changes.push({ from: c.close.from, to: c.close.to, insert: "" });
		}
	}
	return changes.sort((a, b) => a.from - b.from || a.to - b.to);
};
