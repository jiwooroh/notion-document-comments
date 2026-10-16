import { StateEffect, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { anchorRange } from "../format/parse";
import { isCodeComment, resolveCodeAnchor } from "../format/code-anchor";
import { getComments } from "./state";

/** Set (id) or clear (null) the comment whose highlight is hovered/active. */
export const setActiveAnchor = StateEffect.define<string | null>();

/** A transaction that only moves the hover highlight. Hovering over text
 *  dispatches these constantly, so the margin and highlight painters skip them
 *  (otherwise every mouse move over a highlight re-measured every card). */
export const isHoverOnly = (tr: Transaction): boolean =>
	!tr.docChanged && !tr.selection && tr.effects.length > 0 && tr.effects.every((e) => e.is(setActiveAnchor));

const ACTIVE = Decoration.mark({ class: "dc-active-anchor" });

type Active = { id: string | null; decorations: DecorationSet };

const build = (state: EditorView["state"], id: string | null): DecorationSet => {
	if (!id) return Decoration.none;
	const c = getComments(state).find((x) => x.id === id);
	if (!c) return Decoration.none;
	const range = isCodeComment(c) ? resolveCodeAnchor(state.doc.toString(), c) : anchorRange(c);
	if (!range || range.to <= range.from || range.to > state.doc.length) return Decoration.none;
	return Decoration.set([ACTIVE.range(range.from, range.to)]);
};

/**
 * The darker hover/active tint on a comment's highlight, as a decoration the
 * editor owns. Toggling a class on the highlight's DOM directly didn't stick:
 * CodeMirror redraws those elements and drops classes it didn't put there.
 * The inner mark inherits its comment's color variables from the outer
 * highlight span, so it darkens in that comment's own color.
 */
export const activeAnchorField = StateField.define<Active>({
	create: () => ({ id: null, decorations: Decoration.none }),
	update(value, tr) {
		let id = value.id;
		for (const e of tr.effects) if (e.is(setActiveAnchor)) id = e.value;
		if (id === value.id && !tr.docChanged) return value;
		return { id, decorations: build(tr.state, id) };
	},
	provide: (f) => EditorView.decorations.from(f, (v) => v.decorations),
});
