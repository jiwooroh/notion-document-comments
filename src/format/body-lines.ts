import { parseComments } from "./parse";

/**
 * A comment body written by hand or by another tool can hold an empty line
 * (e.g. between a reply's paragraphs). Next to text in a paragraph, an empty
 * line ends the paragraph, so the HTML comment is cut off there and the rest
 * of the body shows in Reading view and PDF. The parser skips empty body lines
 * anyway, so dropping them changes nothing else. Empty when nothing needs fixing.
 */
export const computeBodyBlankLineFixes = (doc: string): Array<{ from: number; to: number; insert: string }> => {
	const changes: Array<{ from: number; to: number; insert: string }> = [];
	for (const c of parseComments(doc)) {
		if (!c.body) continue;
		const block = doc.slice(c.body.from, c.body.to);
		const fixed = block.replace(/\n(?:[ \t]*\r?\n)+/g, "\n");
		if (fixed !== block) changes.push({ from: c.body.from, to: c.body.to, insert: fixed });
	}
	return changes;
};
