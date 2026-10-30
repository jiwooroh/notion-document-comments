import { RangeSetBuilder, type Text } from "@codemirror/state";
import { Decoration, type DecorationSet, type EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";

/** A Markdown list item: indentation, marker, and an optional task box. */
const LIST_ITEM = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]+(\[.\][ \t]+)?/;
/** How far up to look for a list item's parents (keeps long notes cheap). */
const MAX_LOOKBACK = 300;

/** Indentation width in columns (tabs count as `tabSize`). */
const indentWidth = (indent: string, tabSize: number): number => {
	let width = 0;
	for (const ch of indent) width += ch === "\t" ? tabSize - (width % tabSize) : 1;
	return width;
};

/**
 * For a list item under a task item (`- [x]`, `- [?]`, …), how many list levels
 * below that task it sits (1 = its direct child), or 0 when no task item is
 * among its parents. Lines are 1-based. Exported for tests.
 */
export const levelBelowTask = (doc: Text, lineNo: number, tabSize: number): number => {
	const own = LIST_ITEM.exec(doc.line(lineNo).text);
	if (!own) return 0;
	let width = indentWidth(own[1] ?? "", tabSize);
	// A top-level item has no parent, so no task above it (and scanning a long
	// flat list back up to MAX_LOOKBACK lines on every keystroke adds up).
	if (width === 0) return 0;
	let levels = 0;
	const stop = Math.max(1, lineNo - MAX_LOOKBACK);
	for (let n = lineNo - 1; n >= stop; n--) {
		const text = doc.line(n).text;
		if (text.trim() === "") continue;
		const m = LIST_ITEM.exec(text);
		if (!m) {
			// A continuation line of an item belongs to that item; anything else
			// that isn't indented ends the list.
			if (/^[ \t]/.test(text)) continue;
			return 0;
		}
		const w = indentWidth(m[1] ?? "", tabSize);
		if (w >= width) continue; // a sibling or a deeper item: not a parent
		levels++;
		if (m[2]) return levels; // the nearest parent that is a task item
		width = w;
		if (w === 0) return 0; // reached the top of the list without a task parent
	}
	return 0;
};

const lineClass = (level: number): Decoration =>
	Decoration.line({ class: `dc-below-task dc-below-task-${Math.min(level, 9)}` });

const build = (view: EditorView): DecorationSet => {
	const builder = new RangeSetBuilder<Decoration>();
	const { doc, tabSize } = view.state;
	for (const { from, to } of view.visibleRanges) {
		let pos = from;
		while (pos <= to) {
			const line = doc.lineAt(pos);
			const level = levelBelowTask(doc, line.number, tabSize);
			if (level > 0) builder.add(line.from, line.from, lineClass(level));
			pos = line.to + 1;
		}
	}
	return builder.finish();
};

/**
 * Marks editor list lines that sit under a task item with how deep below it
 * they are (`dc-below-task-N`). A task item shows its checkbox icon instead of
 * a bullet, so a style (e.g. a CSS snippet) can restart the bullet shapes
 * under it — Live Preview draws each line on its own, so CSS alone can't see
 * that a line's parent is a task item.
 */
export const listBelowTaskPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = build(view);
		}
		update(update: ViewUpdate): void {
			if (update.docChanged || update.viewportChanged) this.decorations = build(update.view);
		}
	},
	{ decorations: (v) => v.decorations },
);
