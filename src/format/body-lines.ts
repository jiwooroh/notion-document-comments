import { parseComments } from "./parse";
import { blockEnd } from "../editor/edits";

/** What may come before a line's content: indentation, blockquote `>`, a list
 *  marker (with an optional task box). */
const LINE_PREFIX = /^[ \t]*(?:>[ \t]?)*[ \t]*(?:(?:[-+*]|\d+[.)])[ \t]+(?:\[.\][ \t]+)?)?$/;

const lineStartAt = (doc: string, pos: number): number => doc.lastIndexOf("\n", pos - 1) + 1;

/** Empty lines inside comment bodies, dropped. The parser skips them anyway. */
const withoutBodyBlankLines = (doc: string): string => {
	let out = doc;
	for (const c of parseComments(doc).reverse()) {
		if (!c.body) continue;
		const block = out.slice(c.body.from, c.body.to);
		const fixed = block.replace(/\n(?:[ \t]*\r?\n)+/g, "\n");
		if (fixed !== block) out = out.slice(0, c.body.from) + fixed + out.slice(c.body.to);
	}
	return out;
};

/** A multi-line body that starts partway through a line whose content starts
 *  with `<!--` (e.g. a comment on the paragraph's first words), or null. */
const misplacedBody = (doc: string): { from: number; to: number } | null => {
	for (const c of parseComments(doc)) {
		if (!c.body) continue;
		const { from, to } = c.body;
		const lineStart = lineStartAt(doc, from);
		if (lineStart === from || !doc.slice(from, to).includes("\n")) continue;
		const rest = doc.slice(lineStart, from);
		const content = rest.search(/<!--/);
		if (content >= 0 && LINE_PREFIX.test(rest.slice(0, content))) return { from, to };
	}
	return null;
};

/**
 * Comment bodies written by hand or by another tool can break Reading view and
 * PDF export, showing part of the comment as note text:
 * - An empty line inside a body ends the paragraph, cutting the HTML comment off.
 * - A line whose content starts with `<!--` is an HTML block that ends with that
 *   line, so a multi-line body that starts on it spills into the note.
 * Drop the empty lines, and move such bodies to their own line after the
 * paragraph — where the plugin puts the bodies it writes. The comments
 * themselves don't change. Empty when nothing needs fixing; otherwise one
 * change covering the edited span.
 */
export const computeBodyLayoutFixes = (doc: string): Array<{ from: number; to: number; insert: string }> => {
	let out = withoutBodyBlankLines(doc);
	for (let i = 0; i < 100; i++) {
		const body = misplacedBody(out);
		if (!body) break;
		const block = out.slice(body.from, body.to);
		// Keep the space between the text before and after the body.
		const after = out.slice(body.to);
		const joined = out.slice(0, body.from) + after;
		const end = blockEnd(joined, body.from);
		out = joined.slice(0, end) + "\n" + block + joined.slice(end);
	}
	if (out === doc) return [];
	let start = 0;
	while (start < doc.length && start < out.length && doc[start] === out[start]) start++;
	let endDoc = doc.length;
	let endOut = out.length;
	while (endDoc > start && endOut > start && doc[endDoc - 1] === out[endOut - 1]) {
		endDoc--;
		endOut--;
	}
	return [{ from: start, to: endDoc, insert: out.slice(start, endOut) }];
};
