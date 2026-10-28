import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";
import { anchorRange, anchorStyle } from "../format/parse";
import type { ParsedComment } from "../format/types";
import { isCodeComment } from "../format/code-anchor";
import { findRenderedMatch } from "../reading/highlight";
import { commentConfig } from "./config";
import { getComments } from "./state";
import { isHoverOnly } from "./active";

type BrowserWindow = NonNullable<Document["defaultView"]>;

/** Inline HTML in commented text — `<span>`, `<mark>`, `<strong>`, `<u>`, … */
const HAS_INLINE_HTML = /<[a-zA-Z][^>]*>/;
/** A rendered (non-editable) widget inside the line — how Live Preview shows
 *  inline HTML. Source text the normal mark covers is editable. */
const RENDERED_WIDGET = '[contenteditable="false"]';
const PREFIX = "nsc-html";

/** CSS highlight name for a comment's color and style (see styles.css). */
export const highlightName = (color: string | undefined, style: string | undefined, resolved: boolean): string =>
	resolved ? `${PREFIX}-resolved` : `${PREFIX}-${color ?? "default"}-${style ?? "default"}`;

// `CSS.highlights` is per document; every editor view in a window contributes.
const rangesByDocument = new WeakMap<Document, Map<EditorView, Map<string, Range[]>>>();
// What was last registered per document, so an unchanged pass doesn't make the
// browser restyle the page.
const lastSignature = new WeakMap<Document, string>();
const nodeIds = new WeakMap<Node, number>();
let nextNodeId = 1;
const nodeId = (node: Node): number => {
	let id = nodeIds.get(node);
	if (id === undefined) {
		id = nextNodeId++;
		nodeIds.set(node, id);
	}
	return id;
};
const rangeSignature = (views: Map<EditorView, Map<string, Range[]>>): string =>
	Array.from(views.values())
		.flatMap((m) =>
			Array.from(
				m,
				([name, list]) =>
					`${name}:${list.map((r) => `${nodeId(r.startContainer)}.${r.startOffset}-${r.endOffset}`).join(",")}`,
			),
		)
		.join("|");

/**
 * Live Preview renders inline HTML (`<span class=…>`, `<mark>`, `<strong>`, …)
 * as its own block over the source text, so the comment highlight — a mark on
 * the source — is hidden underneath wherever the commented text is inside such
 * HTML. Find that text in the rendered block and paint it with CSS Custom
 * Highlights instead, per color and style. Plain parts keep the normal mark.
 */
class HtmlHighlights {
	private timer: number | null = null;
	private observer: MutationObserver | null = null;
	/** Comments that need this path (inline HTML in the anchor, or a lost
	 *  marker); recomputed only when the document changes. Empty → no work. */
	private candidates: ParsedComment[] = [];

	constructor(private view: EditorView) {
		this.collect();
		this.schedule();
	}

	update(update: ViewUpdate): void {
		if (update.docChanged) this.collect();
		// Cursor moves alone don't change what's rendered; skip them. An empty
		// transaction is how settings changes refresh the editor, so keep those.
		const settingsRefresh = update.transactions.some((tr) => !tr.docChanged && !tr.selection && !isHoverOnly(tr));
		if (update.docChanged || update.viewportChanged || update.geometryChanged || settingsRefresh) this.schedule();
	}

	destroy(): void {
		if (this.timer !== null) (this.view.dom.ownerDocument.defaultView ?? window).cancelAnimationFrame(this.timer);
		this.observer?.disconnect();
		setViewRanges(this.view, new Map(), true);
	}

	/** Find the comments this plugin has to paint, and only watch the DOM
	 *  (Live Preview renders HTML widgets a moment later) while there are any. */
	private collect(): void {
		const doc = this.view.state.doc;
		this.candidates = getComments(this.view.state).filter((c) => {
			if (isCodeComment(c)) return false;
			const range = anchorRange(c);
			if (!range) return !!c.quote && !!(c.close || c.open);
			return range.to <= doc.length && HAS_INLINE_HTML.test(doc.sliceString(range.from, range.to));
		});
		if (this.candidates.length > 0 && !this.observer) {
			this.observer = new MutationObserver(() => this.schedule());
			this.observer.observe(this.view.contentDOM, { childList: true, subtree: true });
		} else if (this.candidates.length === 0 && this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}

	/** Coalesce bursts (typing, scrolling, widget re-renders) into one pass per
	 *  frame — soon enough that highlights appear with the text, not after it. */
	private schedule(): void {
		if (this.timer !== null) return;
		const win = this.view.dom.ownerDocument.defaultView ?? window;
		this.timer = win.requestAnimationFrame(() => {
			this.timer = null;
			this.refresh();
		});
	}

	private refresh(): void {
		const cfg = this.view.state.facet(commentConfig);
		const byName = new Map<string, Range[]>();
		if (cfg.showComments() && this.candidates.length > 0) {
			const doc = this.view.state.doc;
			for (const c of this.candidates) {
				if (!cfg.showResolved() && c.status === "resolved") continue;
				const range = anchorRange(c);
				let line: HTMLElement | null;
				let source: string;
				// A comment that lost a marker has no mark decoration at all: find its
				// saved quote on the line of the marker that remains and paint all of it.
				let lost = false;
				if (range) {
					if (range.to > doc.length) continue;
					source = doc.sliceString(range.from, range.to);
					if (!HAS_INLINE_HTML.test(source)) continue;
					line = this.lineElement(range.from);
					if (!line || line !== this.lineElement(range.to)) continue;
				} else {
					const at = c.close?.from ?? c.open?.to;
					if (at === undefined || !c.quote || at > doc.length) continue;
					source = c.quote;
					line = this.lineElement(at);
					lost = true;
				}
				if (!line) continue;
				const parts = findRenderedMatch(line, source);
				if (!parts) continue;
				const name = highlightName(c.color, anchorStyle(c), c.status === "resolved");
				for (const part of parts) {
					// Only inside rendered HTML; the rest already has the mark decoration.
					if (!lost && !part.node.parentElement?.closest(RENDERED_WIDGET)) continue;
					const r = line.ownerDocument.createRange();
					r.setStart(part.node, part.from);
					r.setEnd(part.node, part.to);
					const list = byName.get(name) ?? [];
					list.push(r);
					byName.set(name, list);
				}
			}
		}
		setViewRanges(this.view, byName);
	}

	/** The `.cm-line` showing document position `pos`, if it's rendered. */
	private lineElement(pos: number): HTMLElement | null {
		try {
			const { node } = this.view.domAtPos(pos);
			const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
			return el?.closest<HTMLElement>(".cm-line") ?? null;
		} catch {
			return null;
		}
	}
}

export const htmlHighlightPlugin = ViewPlugin.fromClass(HtmlHighlights);

const setViewRanges = (view: EditorView, ranges: Map<string, Range[]>, remove = false): void => {
	const doc = view.dom.ownerDocument;
	let views = rangesByDocument.get(doc);
	if (!views) {
		views = new Map();
		rangesByDocument.set(doc, views);
	}
	const previous = new Set(Array.from(views.values()).flatMap((m) => Array.from(m.keys())));
	if (remove) views.delete(view);
	else views.set(view, ranges);

	const signature = rangeSignature(views);
	if (!remove && signature === lastSignature.get(doc)) return;
	lastSignature.set(doc, signature);

	const scope: BrowserWindow | null = doc.defaultView;
	if (!scope?.CSS?.highlights || typeof scope.Highlight !== "function") return;
	const merged = new Map<string, Range[]>();
	for (const m of views.values()) {
		for (const [name, list] of m) merged.set(name, [...(merged.get(name) ?? []), ...list]);
	}
	for (const name of previous) if (!merged.has(name)) scope.CSS.highlights.delete(name);
	for (const [name, list] of merged) scope.CSS.highlights.set(name, new scope.Highlight(...list));
};
