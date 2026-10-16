import type { ParsedComment } from "../format/types";
import type { Card } from "./card";
import { stackTops } from "./stack";

/**
 * "PDF style" card view (body class `dc-pdf-cards`): like a PDF reader, each
 * comment is a small note icon in the margin, level with its highlight, and its
 * card opens as a popover beside the icon. The cards are the same Card
 * elements — collapsed to an icon by CSS until opened (`dc-pdf-open`).
 */

/** Icon box size and the gap between stacked icons, in px (see styles.css). */
export const PIN_SIZE = 20;
export const PIN_GAP = 4;
const POPOVER_MARGIN = 8;
/** Space between the end of the text column and the icons, in px. */
const PIN_TEXT_GAP = 6;
/** Icon width, in px (--dc-pin-width in styles.css). */
const PIN_WIDTH = 20;

/** Right edge of an element's content box (inside its right padding), in
 *  viewport coordinates. */
const textContentRight = (el: Element): number =>
	el.getBoundingClientRect().right - (parseFloat(getComputedStyle(el).paddingRight) || 0);
const PREVIEW_MAX = 120;

export const isPdfCards = (doc: Document): boolean => doc.body.hasClass("dc-pdf-cards");

/** Tops for icons centered on their anchors (`mids`), stacked so none overlap.
 *  Returned in input order. */
export const pinTops = (mids: number[]): number[] =>
	stackTops(
		mids.map((mid) => ({ top: mid - PIN_SIZE / 2, height: PIN_SIZE })),
		PIN_GAP,
	);

/** Keep an open popover inside the visible area [viewTop, viewBottom]: shift
 *  it up when it would run off the bottom, but never above the top. */
export const clampPopover = (top: number, height: number, viewTop: number, viewBottom: number): number =>
	Math.max(viewTop + POPOVER_MARGIN, Math.min(top, viewBottom - height - POPOVER_MARGIN));

/** The icon's hover tooltip: the first line of the comment, Markdown stripped. */
export const previewText = (c: Pick<ParsedComment, "thread">): string => {
	const text = c.thread[0]?.text ?? "";
	const line =
		text
			.split(/\\n|\n/)
			.map((l) => l.trim())
			.find((l) => l.length > 0) ?? "";
	const plain = line
		.replace(/^(?:[-+*]|\d+[.)]|#{1,6}|>)\s+/, "")
		.replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, alias?: string) => alias ?? target)
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/[*_`~=]+/g, "")
		.trim();
	return plain.length > PREVIEW_MAX ? `${plain.slice(0, PREVIEW_MAX - 1)}…` : plain;
};

/**
 * Lay out cards as icons: stack the icons on their anchors, put an open card's
 * popover at its icon (clamped to the visible area), and give collapsed icons
 * the comment's first line as a tooltip.
 */
export const layoutPins = (
	anchored: Array<{ card: Card; mid: number; comment: ParsedComment }>,
	openId: string | null,
	view: { top: number; bottom: number },
	column: { container: HTMLElement; text: Element | null },
): void => {
	// Icons sit right next to the text's right edge, not at the far side of the
	// column's padding.
	if (column.text) {
		const textRight = textContentRight(column.text);
		const box = column.container.getBoundingClientRect();
		// In a narrow pane the text runs under the column; keep the pin inside it.
		const left = Math.round(Math.min(textRight - box.left + PIN_TEXT_GAP, box.width - PIN_WIDTH - PIN_TEXT_GAP));
		column.container.setCssProps({ "--dc-pin-left": `${left}px` });
	}
	const tops = pinTops(anchored.map((a) => a.mid));
	anchored.forEach(({ card, comment }, i) => {
		card.setCrowded(false);
		let top = tops[i] ?? 0;
		const open = card.id === openId;
		card.el.toggleClass("dc-pdf-open", open);
		if (open) top = clampPopover(top, card.el.offsetHeight, view.top, view.bottom);
		card.el.setCssStyles({ top: `${top}px` });
		const title = open ? "" : previewText(comment);
		if ((card.el.getAttribute("title") ?? "") !== title) {
			if (title) card.el.setAttribute("title", title);
			else card.el.removeAttribute("title");
		}
	});
};

/**
 * Open/close state for one margin column in PDF style. Clicking an icon (or a
 * highlight, via `open`) opens its card; clicking the icon again, Escape, or a
 * click outside closes it.
 */
export class PdfPins {
	openId: string | null = null;

	constructor(
		private container: HTMLElement,
		private cards: Map<string, Card>,
		private relayout: () => void,
	) {
		container.addEventListener("mousedown", this.onContainerMouseDown, true);
		const doc = container.ownerDocument;
		doc.addEventListener("mousedown", this.onDocMouseDown, true);
		doc.addEventListener("keydown", this.onKeyDown, true);
	}

	destroy(): void {
		this.container.removeEventListener("mousedown", this.onContainerMouseDown, true);
		const doc = this.container.ownerDocument;
		doc.removeEventListener("mousedown", this.onDocMouseDown, true);
		doc.removeEventListener("keydown", this.onKeyDown, true);
	}

	open(id: string): void {
		if (!isPdfCards(this.container.ownerDocument) || this.openId === id) return;
		this.openId = id;
		this.relayout();
	}

	close(): void {
		if (this.openId === null) return;
		this.cards.get(this.openId)?.el.removeClass("dc-pdf-open");
		this.openId = null;
		this.relayout();
	}

	private cardAt(target: EventTarget | null): Card | null {
		const el = target instanceof Element ? target.closest<HTMLElement>(".doc-comment-card") : null;
		if (!el) return null;
		for (const card of this.cards.values()) if (card.el === el) return card;
		return null;
	}

	/** Capture phase, before the card's own handlers: a collapsed icon only opens. */
	private onContainerMouseDown = (e: MouseEvent): void => {
		if (!isPdfCards(this.container.ownerDocument)) return;
		const card = this.cardAt(e.target);
		if (!card) return;
		if (card.id !== this.openId) {
			e.preventDefault();
			e.stopPropagation();
			this.open(card.id);
			return;
		}
		// The open card's pin sits just beside it (a pseudo-element, so the click
		// lands on the card itself): clicking it again closes the card.
		const rect = card.el.getBoundingClientRect();
		if (e.clientX < rect.left || e.clientX > rect.right) {
			e.preventDefault();
			e.stopPropagation();
			this.close();
		}
	};

	private onDocMouseDown = (e: MouseEvent): void => {
		if (this.openId === null) return;
		const target = e.target instanceof Element ? e.target : null;
		// Inside the open card, on another card, on a highlight (which opens its
		// own), or in a menu/popup the card opened: leave it to those.
		if (target?.closest(".doc-comment-card, .doc-comment-span, .menu, .dc-pop, .modal-container")) return;
		this.close();
	};

	private onKeyDown = (e: KeyboardEvent): void => {
		if (e.key !== "Escape" || this.openId === null) return;
		// Escape in a text field cancels the edit first.
		const active = this.container.ownerDocument.activeElement;
		if (active?.closest("textarea, input") && this.container.contains(active)) return;
		this.close();
	};
}
