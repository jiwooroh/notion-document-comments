import {
	ChangeSet,
	EditorSelection,
	EditorState,
	Extension,
	findClusterBreak,
	StateEffect,
	StateField,
	Transaction,
	TransactionSpec,
} from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { ParsedComment, SuggestionKind, TextRange } from "../format/types";
import { fencedRanges, parseComments } from "../format/parse";
import { closeMarker, openMarker, serializeBody } from "../format/serialize";
import { generateId } from "../format/ids";
import { Change, applyChanges, blockEnd, computeDeleteComment, toData } from "./edits";
import { commentConfig } from "./config";
import { pluginEdit } from "./state";

/*
 * Suggesting mode (Notion / Google Docs "Suggest edits").
 *
 * While it's on, the user's typing never changes the note's text directly:
 * - Typed text is wrapped as an insertion suggestion — an ordinary comment
 *   anchor whose body carries `suggest:insert`.
 * - Deleted text stays in the note, wrapped as a deletion suggestion
 *   (`suggest:delete`), and is drawn struck through.
 * - Editing your own pending insertion edits it in place, and a suggestion
 *   typed right next to another of yours grows it instead of starting a new one.
 *
 * Accepting or rejecting a suggestion (editor/edits.ts) applies or drops it.
 */

export type EditInput = {
	from: number;
	to: number;
	insert: string;
	/** Where the edit put the caret inside `insert` (auto-paired brackets leave
	 *  it between them). Defaults to the end. */
	caret?: number;
};
export type Direction = "backward" | "forward" | "none";

export type SuggestContext = {
	author: string;
	createdAt: string;
};

export type SuggestPlan = {
	/** In the original document's coordinates, sorted and non-overlapping. */
	changes: Change[];
	/** Where each edit leaves the caret, in the document after `changes`. */
	carets: number[];
	/** In the document after `changes`: refreshed suggestion quotes, and
	 *  insertions whose text is now empty removed. */
	followUp: Change[];
	/** Text the edit would have removed that isn't yours to remove, so it was
	 *  kept and marked for deletion instead (original coordinates). */
	deletedRanges: TextRange[];
};

/** Text an IME composition deleted (it replaced a selection), to be put back
 *  as a deletion suggestion once the composition ends. `pos` is where it was. */
export type PendingDeletion = { pos: number; text: string };

type Piece = Change & { seq: number; caret?: number };

const BODY_SEQ = 1_000_000;

/**
 * Turn a user edit into suggestions. `edits` are the user's changes in the
 * original document (CodeMirror's iterChanges order); `pending` are ranges of
 * text typed during an IME composition that will be wrapped once it ends
 * (they count as your own insertion).
 */
export const planSuggestedEdits = (
	doc: string,
	edits: EditInput[],
	ctx: SuggestContext,
	direction: Direction,
	pending: TextRange[] = [],
): SuggestPlan => {
	const comments = parseComments(doc);
	const zones = classifyZones(doc, comments, ctx.author);
	const ids = new Set(comments.map((c) => c.id));
	const newId = () => {
		const id = generateId(ids);
		ids.add(id);
		return id;
	};

	const pieces: Piece[] = [];
	let seq = 0;
	const push = (from: number, to: number, insert: string, caret?: number): Piece => {
		const piece = { from, to, insert, seq: seq++, caret };
		pieces.push(piece);
		return piece;
	};
	const pushBody = (id: string, kind: SuggestionKind, at: number, quote: string) => {
		const data = {
			author: ctx.author,
			createdAt: ctx.createdAt,
			status: "open" as const,
			suggest: kind,
			quote,
			thread: [],
			reactions: [],
		};
		pieces.push({ from: at, to: at, insert: "\n" + serializeBody(id, data), seq: BODY_SEQ + seq++ });
	};
	const touched = new Set<string>();
	const carets: Array<{ piece: Piece } | { pos: number; assoc: -1 | 1 }> = [];

	const inPending = (pos: number, inclusive: boolean) =>
		pending.some((r) => pos >= r.from && (inclusive ? pos <= r.to : pos < r.to));

	const classify = (pos: number): { kind: "protected" | "real" | "already" | "suggest"; owner?: string } => {
		if (zones.protectedRanges.some((r) => pos >= r.from && pos < r.to)) return { kind: "protected" };
		const own = zones.ownInserts.find((c) => pos >= c.open.to && pos < c.close.from);
		if (own) return { kind: "real", owner: own.id };
		if (inPending(pos, false)) return { kind: "real" };
		if (zones.deletes.some((c) => pos >= c.open.to && pos < c.close.from)) return { kind: "already" };
		return { kind: "suggest" };
	};

	const deletedRanges: TextRange[] = [];
	const markDeleted = (from: number, to: number) => {
		deletedRanges.push({ from, to });
		const left = zones.ownDeletes.find((d) => d.close.to === from);
		const right = zones.ownDeletes.find((d) => d.open.from === to);
		if (left) {
			push(left.close.from, left.close.to, "");
			push(to, to, closeMarker(left.id));
			touched.add(left.id);
		} else if (right) {
			push(from, from, openMarker(right.id));
			push(right.open.from, right.open.to, "");
			touched.add(right.id);
		} else {
			const id = newId();
			push(from, from, openMarker(id));
			push(to, to, closeMarker(id));
			pushBody(id, "delete", blockEnd(doc, to), doc.slice(from, to));
			touched.add(id);
		}
	};

	for (const edit of mergeEdits(edits, zones.protectedRanges)) {
		const untracked =
			strictlyInside(zones.untrackable, edit.from) ||
			strictlyInside(zones.untrackable, edit.to) ||
			(edit.from === edit.to && strictlyInside(zones.untrackable, edit.from));
		if (untracked) {
			// Markers can't go here (code, front matter, a link target): let the
			// edit through as a plain edit.
			const piece = push(edit.from, edit.to, edit.insert, edit.insert ? caretIn(edit) : undefined);
			carets.push(edit.insert ? { piece } : { pos: edit.from, assoc: -1 });
			continue;
		}

		// The deleted part: text you typed as a suggestion really goes; anything
		// else is kept and marked for deletion.
		if (edit.to > edit.from) {
			let group: [number, number] | null = null;
			const groups: Array<[number, number]> = [];
			for (const [a, b] of intervals(edit.from, edit.to, zones.breakpoints, pending)) {
				const { kind, owner } = classify(a);
				if (kind === "suggest") {
					group = group ? [group[0], b] : [a, b];
				} else if (kind === "real") {
					if (group) groups.push(group);
					group = null;
					push(a, b, "");
					if (owner) touched.add(owner);
				}
				// Markers and already-deleted text are left as they are; a deletion
				// may span them.
			}
			if (group) groups.push(group);
			for (const [a, b] of groups) markDeleted(a, b);
		}

		if (!edit.insert) {
			carets.push(direction === "forward" ? { pos: edit.to, assoc: 1 } : { pos: edit.from, assoc: -1 });
			continue;
		}

		// The inserted part goes after whatever the edit marked for deletion.
		let at = edit.to;
		for (let guard = 0; guard < 8; guard++) {
			const deletion = zones.deletes.find(
				(d) => (at >= d.open.to && at <= d.close.from) || (at === d.open.from && d.author === ctx.author),
			);
			if (!deletion) break;
			at = deletion.close.to;
		}
		let own = zones.ownInserts.find((c) => at >= c.open.to && at <= c.close.from);
		if (!own) {
			own = zones.ownInserts.find((c) => at === c.close.to);
			if (own) at = own.close.from;
		}
		if (!own) {
			own = zones.ownInserts.find((c) => at === c.open.from);
			if (own) at = own.open.to;
		}
		if (own || inPending(at, true)) {
			if (own) touched.add(own.id);
			carets.push({ piece: push(at, at, edit.insert, caretIn(edit)) });
		} else {
			const id = newId();
			const open = openMarker(id);
			const piece = push(at, at, open + edit.insert + closeMarker(id), open.length + caretIn(edit));
			pushBody(id, "insert", blockEnd(doc, at), edit.insert);
			touched.add(id);
			carets.push({ piece });
		}
	}

	const { changes, offsets } = normalize(pieces);
	const set = ChangeSet.of(changes, doc.length);
	const caretPositions = carets.map((c) => {
		if ("pos" in c) return set.mapPos(c.pos, c.assoc);
		const offset = offsets.get(c.piece) ?? 0;
		return set.mapPos(c.piece.from, -1) + offset + (c.piece.caret ?? 0);
	});
	const next = applyChanges(doc, changes);
	return { changes, carets: caretPositions, followUp: refreshSuggestions(next, touched), deletedRanges };
};

/**
 * Wrap text typed during an IME composition (Korean, Japanese, Chinese…) as an
 * insertion suggestion, once the composition has ended. Wrapping it while the
 * IME is still composing would rewrite the text under the IME and break it.
 */
export const planWrapPending = (
	doc: string,
	ranges: TextRange[],
	ctx: SuggestContext,
	deletions: PendingDeletion[] = [],
): Change[][] => {
	const comments = parseComments(doc);
	const zones = classifyZones(doc, comments, ctx.author);
	const ids = new Set(comments.map((c) => c.id));
	const pieces: Piece[] = [];
	let seq = 0;
	const push = (from: number, to: number, insert: string) => pieces.push({ from, to, insert, seq: seq++ });
	const touched = new Set<string>();
	const pushBody = (id: string, kind: SuggestionKind, at: number, quote: string) => {
		const data = {
			author: ctx.author,
			createdAt: ctx.createdAt,
			status: "open" as const,
			suggest: kind,
			quote,
			thread: [],
			reactions: [],
		};
		pieces.push({ from: at, to: at, insert: "\n" + serializeBody(id, data), seq: BODY_SEQ + seq++ });
	};

	// Put back what the composition replaced, struck through, before the new text.
	for (const { pos, text } of deletions) {
		if (!text || pos < 0 || pos > doc.length) continue;
		const id = generateId(ids);
		ids.add(id);
		push(pos, pos, openMarker(id) + text + closeMarker(id));
		pushBody(id, "delete", blockEnd(doc, pos), text);
		touched.add(id);
	}

	for (const { from, to } of mergeRanges(ranges)) {
		if (to <= from) continue;
		if (strictlyInside(zones.untrackable, from) || strictlyInside(zones.untrackable, to)) continue;
		const inside = zones.ownInserts.find((c) => from >= c.open.to && to <= c.close.from);
		if (inside) {
			touched.add(inside.id);
			continue;
		}
		const left = zones.ownInserts.find((c) => c.close.to === from);
		const right = zones.ownInserts.find((c) => c.open.from === to);
		if (left) {
			push(left.close.from, left.close.to, "");
			push(to, to, closeMarker(left.id));
			touched.add(left.id);
		} else if (right) {
			push(from, from, openMarker(right.id));
			push(right.open.from, right.open.to, "");
			touched.add(right.id);
		} else {
			const id = generateId(ids);
			ids.add(id);
			push(from, from, openMarker(id));
			push(to, to, closeMarker(id));
			pushBody(id, "insert", blockEnd(doc, to), doc.slice(from, to));
			touched.add(id);
		}
	}
	const { changes } = normalize(pieces);
	const next = applyChanges(doc, changes);
	return [changes, refreshSuggestions(next, touched)];
};

/** Keep each touched suggestion's stored quote equal to its text, and drop an
 *  insertion whose text has all been deleted. */
export const refreshSuggestions = (doc: string, ids: Set<string>): Change[] => {
	if (ids.size === 0) return [];
	const out: Change[] = [];
	for (const c of parseComments(doc)) {
		if (!ids.has(c.id) || !c.suggest || c.text === undefined) continue;
		if (c.suggest === "insert" && c.text === "") {
			const removed = computeDeleteComment(doc, c.id);
			if (removed.isOk()) out.push(...removed.value);
			continue;
		}
		if (!c.body) continue;
		const body = serializeBody(c.id, { ...toData(c), quote: c.text });
		if (body !== doc.slice(c.body.from, c.body.to)) out.push({ from: c.body.from, to: c.body.to, insert: body });
	}
	return out.sort((a, b) => a.from - b.from || a.to - b.to);
};

type Anchored = ParsedComment & { open: TextRange; close: TextRange };

type Zones = {
	/** Marker and body ranges — never edited by a suggestion. */
	protectedRanges: TextRange[];
	ownInserts: Anchored[];
	ownDeletes: Anchored[];
	deletes: Anchored[];
	/** Where a marker would break the Markdown (code, front matter, links). */
	untrackable: TextRange[];
	/** Every offset where the classification of a character can change. */
	breakpoints: number[];
};

const isAnchoredSuggestion = (c: ParsedComment): c is Anchored => {
	return !!c.suggest && !!c.open && !!c.close && c.open.to <= c.close.from;
};

const classifyZones = (doc: string, comments: ParsedComment[], author: string): Zones => {
	const protectedRanges = comments
		.flatMap((c) => [c.open, c.close, c.body])
		.filter((r): r is TextRange => r !== null);
	const anchored = comments.filter(isAnchoredSuggestion);
	const ownInserts = anchored.filter((c) => c.suggest === "insert" && c.author === author);
	const deletes = anchored.filter((c) => c.suggest === "delete");
	const ownDeletes = deletes.filter((c) => c.author === author);
	const breakpoints = [
		...protectedRanges.flatMap((r) => [r.from, r.to]),
		...anchored.flatMap((c) => [c.open.to, c.close.from]),
	];
	return {
		protectedRanges,
		ownInserts,
		ownDeletes,
		deletes,
		untrackable: untrackableRanges(doc),
		breakpoints,
	};
};

/** Ranges where an HTML-comment marker would show literally or break syntax. */
export const untrackableRanges = (doc: string): TextRange[] => {
	const ranges: TextRange[] = fencedRanges(doc).map(([from, to]) => ({ from, to }));
	const frontmatter = /^---\r?\n[\s\S]*?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(doc);
	if (frontmatter) ranges.push({ from: 0, to: frontmatter[0].length });
	for (const re of [/`+[^`\n]*`+/g, /!?\[\[[^\]\n]*\]\]/g, /\]\([^)\n]*\)/g, /\$\$[\s\S]*?\$\$/g]) {
		let m: RegExpExecArray | null;
		while ((m = re.exec(doc))) ranges.push({ from: m.index, to: m.index + m[0].length });
	}
	return ranges;
};

const caretIn = (edit: EditInput): number => {
	return Math.max(0, Math.min(edit.caret ?? edit.insert.length, edit.insert.length));
};

const strictlyInside = (ranges: TextRange[], pos: number): boolean => {
	return ranges.some((r) => pos > r.from && pos < r.to);
};

/** Sub-intervals of [from, to) split at every breakpoint inside it. */
const intervals = (from: number, to: number, breakpoints: number[], pending: TextRange[]): Array<[number, number]> => {
	const cuts = new Set([from, to]);
	for (const p of [...breakpoints, ...pending.flatMap((r) => [r.from, r.to])]) {
		if (p > from && p < to) cuts.add(p);
	}
	const sorted = Array.from(cuts).sort((a, b) => a - b);
	return sorted.slice(0, -1).map((a, i) => [a, sorted[i + 1] ?? a]);
};

/** CodeMirror splits a deletion around the markers it isn't allowed to remove;
 *  join those pieces back so one selection makes one deletion suggestion. */
const mergeEdits = (edits: EditInput[], protectedRanges: TextRange[]): EditInput[] => {
	const onlyProtected = (from: number, to: number): boolean => {
		let pos = from;
		while (pos < to) {
			const r = protectedRanges.find((p) => p.from <= pos && p.to > pos);
			if (!r) return false;
			pos = r.to;
		}
		return true;
	};
	const out: EditInput[] = [];
	for (const edit of [...edits].sort((a, b) => a.from - b.from)) {
		const last = out[out.length - 1];
		if (last && !last.insert && last.to < edit.to && onlyProtected(last.to, edit.from)) {
			last.to = edit.to;
			last.insert = edit.insert;
		} else {
			out.push({ ...edit });
		}
	}
	return out;
};

const mergeRanges = (ranges: TextRange[]): TextRange[] => {
	const out: TextRange[] = [];
	for (const r of [...ranges].sort((a, b) => a.from - b.from)) {
		const last = out[out.length - 1];
		if (last && r.from <= last.to) last.to = Math.max(last.to, r.to);
		else out.push({ ...r });
	}
	return out;
};

/** Sort pieces into a valid CodeMirror change list: by position, insertions
 *  before a deletion starting at the same offset, and insertions at the same
 *  offset joined in the order they were made (bodies last). `offsets` gives
 *  where each original insertion piece starts inside its joined change. */
const normalize = (pieces: Piece[]): { changes: Change[]; offsets: Map<Piece, number> } => {
	const sorted = [...pieces].sort(
		(a, b) => a.from - b.from || Number(a.to > a.from) - Number(b.to > b.from) || a.seq - b.seq,
	);
	const changes: Change[] = [];
	const offsets = new Map<Piece, number>();
	for (const p of sorted) {
		const last = changes[changes.length - 1];
		if (last && p.to === p.from && last.to === last.from && last.from === p.from) {
			offsets.set(p, last.insert.length);
			last.insert += p.insert;
		} else {
			offsets.set(p, 0);
			changes.push({ from: p.from, to: p.to, insert: p.insert });
		}
	}
	return { changes, offsets };
};

// ---------------------------------------------------------------------------
// CodeMirror wiring
// ---------------------------------------------------------------------------

const clearPending = StateEffect.define<null>();

const PENDING = Decoration.mark({
	class: "doc-comment-span dc-style-suggest-insert dc-suggest-pending",
	inclusive: true,
});

const isSuggesting = (state: EditorState): boolean => {
	return state.facet(commentConfig).suggesting?.() ?? false;
};

/** Text typed during an IME composition while suggesting, not yet wrapped.
 *  Drawn like an insertion so it doesn't flash as plain text. */
const pendingField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(value, tr) {
		let next = value.map(tr.changes);
		if (tr.effects.some((e) => e.is(clearPending))) next = Decoration.none;
		const composed = tr.docChanged && tr.isUserEvent("input.type.compose") && !tr.annotation(pluginEdit);
		if (composed && isSuggesting(tr.startState)) {
			const added: Array<ReturnType<typeof PENDING.range>> = [];
			tr.changes.iterChanges((_fromA, _toA, fromB, toB) => {
				if (toB > fromB) added.push(PENDING.range(fromB, toB));
			});
			if (added.length) next = next.update({ add: added, sort: true });
		}
		return next;
	},
	provide: (f) => EditorView.decorations.from(f),
});

const addPendingDeletions = StateEffect.define<PendingDeletion[]>();

const pendingDeletionsField = StateField.define<PendingDeletion[]>({
	create: () => [],
	update(value, tr) {
		let next = tr.docChanged ? value.map((d) => ({ ...d, pos: tr.changes.mapPos(d.pos, -1) })) : value;
		for (const e of tr.effects) {
			if (e.is(clearPending)) next = [];
			if (e.is(addPendingDeletions)) next = [...next, ...e.value];
		}
		return next;
	},
});

const pendingRanges = (state: EditorState): TextRange[] => {
	const out: TextRange[] = [];
	const iter = state.field(pendingField, false)?.iter();
	while (iter?.value) {
		out.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return out;
};

const context = (state: EditorState): SuggestContext => ({
	author: state.facet(commentConfig).author(),
	createdAt: new Date().toISOString(),
});

/** The text a Backspace / Delete at each caret targets, skipping hidden
 *  markers. CodeMirror's own target would be the marker itself (it's atomic),
 *  which the marker protection then drops, so the key would do nothing. */
const keyDeletionEdits = (state: EditorState, forward: boolean): EditInput[] | null => {
	if (state.selection.ranges.some((r) => !r.empty)) return null;
	const doc = state.doc.toString();
	const hidden = parseComments(doc)
		.flatMap((c) => [c.open, c.close, c.body])
		.filter((r): r is TextRange => r !== null);
	return state.selection.ranges.flatMap((range) => {
		let pos = range.head;
		for (let moved = true; moved;) {
			moved = false;
			const marker = hidden.find((r) => (forward ? r.from === pos : r.to === pos));
			if (marker) {
				pos = forward ? marker.to : marker.from;
				moved = true;
			}
		}
		const target = findClusterBreak(doc, pos, forward);
		if (target === pos) return [];
		return [forward ? { from: pos, to: target, insert: "" } : { from: target, to: pos, insert: "" }];
	});
};

const suggestFilter = EditorState.transactionFilter.of((tr) => {
	if (!isSuggesting(tr.startState) || tr.annotation(pluginEdit)) return tr;
	if (!tr.isUserEvent("input") && !tr.isUserEvent("delete") && !tr.isUserEvent("move")) return tr;
	const composing = tr.isUserEvent("input.type.compose");
	const userEvent = tr.annotation(Transaction.userEvent) ?? "";
	const direction: Direction = /backward/.test(userEvent)
		? "backward"
		: /forward/.test(userEvent)
			? "forward"
			: "none";
	let edits: EditInput[] | null = null;
	if (userEvent === "delete.backward" || userEvent === "delete.forward") {
		edits = keyDeletionEdits(tr.startState, userEvent === "delete.forward");
	}
	if (!edits) {
		if (!tr.docChanged) return tr;
		const collected: EditInput[] = [];
		const head = tr.newSelection.main.head;
		tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) =>
			collected.push({
				from: fromA,
				to: toA,
				insert: inserted.toString(),
				caret: head >= fromB && head <= toB ? head - fromB : undefined,
			}),
		);
		edits = collected;
	}
	if (edits.length === 0) return tr.docChanged ? {} : tr;

	const plan = planSuggestedEdits(
		tr.startState.doc.toString(),
		edits,
		context(tr.startState),
		direction,
		pendingRanges(tr.startState),
	);
	// Composition input is left alone (rewriting it under the IME breaks it):
	// pendingField tracks it and it's wrapped once the composition ends. The
	// exception is a composition that replaces a selection, which deletes the
	// selected text: the keydown handler in selectionGuard usually turns the
	// selection into a deletion first, and when it couldn't (no key event), the
	// deleted text is remembered and put back struck through once composing ends.
	if (composing) {
		if (plan.deletedRanges.length === 0) return tr;
		const doc = tr.startState.doc.toString();
		const deletions = plan.deletedRanges.map((r) => ({
			pos: tr.changes.mapPos(r.from, -1),
			text: doc.slice(r.from, r.to),
		}));
		return [tr, { effects: addPendingDeletions.of(deletions), sequential: true }];
	}
	const mainIndex = Math.min(tr.startState.selection.mainIndex, plan.carets.length - 1);
	const specs: TransactionSpec[] = [
		{
			changes: plan.changes,
			selection: plan.carets.length
				? EditorSelection.create(
						plan.carets.map((pos) => EditorSelection.cursor(pos)),
						Math.max(0, mainIndex),
					)
				: undefined,
			effects: tr.effects,
			userEvent,
			scrollIntoView: true,
		},
	];
	if (plan.followUp.length) specs.push({ changes: plan.followUp, sequential: true });
	return specs;
});

/** Wraps composed text once the IME is done with it. */
const pendingFlush = ViewPlugin.fromClass(
	class {
		private timer = 0;

		constructor(private view: EditorView) {
			view.contentDOM.addEventListener("compositionend", this.schedule);
		}

		update(update: ViewUpdate): void {
			const waiting =
				update.state.field(pendingField).size > 0 || update.state.field(pendingDeletionsField).length > 0;
			if (waiting && !update.view.composing) this.schedule();
		}

		private schedule = (): void => {
			window.clearTimeout(this.timer);
			this.timer = window.setTimeout(() => this.flush(), 30);
		};

		private flush(): void {
			const { view } = this;
			if (view.composing) return;
			const ranges = pendingRanges(view.state);
			const deletions = view.state.field(pendingDeletionsField);
			if (ranges.length === 0 && deletions.length === 0) return;
			const [changes = [], followUp = []] = planWrapPending(
				view.state.doc.toString(),
				ranges,
				context(view.state),
				deletions,
			);
			const specs: TransactionSpec[] = [
				{
					changes,
					effects: clearPending.of(null),
					annotations: pluginEdit.of(true),
					// The history always joins an "input.type.compose" event onto the
					// previous one (the composed typing), whatever the time or selection
					// changes in between, so one undo removes the text with its markers
					// instead of leaving it behind untracked.
					userEvent: "input.type.compose",
				},
			];
			if (followUp.length) {
				specs.push({
					changes: followUp,
					sequential: true,
					annotations: pluginEdit.of(true),
					userEvent: "input.type.compose",
				});
			}
			view.dispatch(...specs);
		}

		destroy(): void {
			window.clearTimeout(this.timer);
			this.view.contentDOM.removeEventListener("compositionend", this.schedule);
		}
	},
);

/** Typing over a selection with an IME: before the IME starts composing (it
 *  would replace the selection in the page itself), mark the selected text
 *  for deletion and put the caret after it, so the composition starts there. */
const selectionGuard = ViewPlugin.fromClass(
	class {
		constructor(private view: EditorView) {
			view.contentDOM.addEventListener("keydown", this.onKeyDown, true);
		}

		private onKeyDown = (event: KeyboardEvent): void => {
			const { view } = this;
			if (!isSuggesting(view.state) || event.metaKey || event.ctrlKey || event.altKey) return;
			// "Process" is what an IME reports for the key that starts composing.
			if (event.key !== "Process" && !event.isComposing) return;
			if (view.state.selection.ranges.every((r) => r.empty)) return;
			view.dispatch({
				changes: view.state.selection.ranges.map((r) => ({ from: r.from, to: r.to })),
				// "forward": the caret lands after the struck text, where the new
				// text goes.
				userEvent: "delete.selection.forward",
			});
		};

		destroy(): void {
			this.view.contentDOM.removeEventListener("keydown", this.onKeyDown, true);
		}
	},
);

/** Everything Suggesting mode needs in the editor. Inert while editing. */
export const suggestExtension: Extension = [
	pendingField,
	pendingDeletionsField,
	suggestFilter,
	pendingFlush,
	selectionGuard,
];
