/** Default vertical gap between stacked margin notes, in px. */
const GAP = 8;
/** Extra space kept above a lifted note, in px. */
const SAFETY = 4;

export type NoteBox = {
	/** Where the note wants to start: its highlight's top. */
	desired: number;
	height: number;
};

/**
 * Place margin notes as close to their highlights as possible without
 * overlapping. Notes that would collide form a cluster, and the cluster is
 * centered on its members' highlights (each member's desired top minus its
 * offset inside the cluster) — so a crowded run spreads both up and down
 * instead of everything piling up below the first note. Clusters never move
 * above 0 or into the previous cluster. Input is in document order.
 */
export const stackNotes = (boxes: NoteBox[], gap = GAP): number[] => {
	type Cluster = { first: number; last: number; top: number; height: number };
	const clusters: Cluster[] = [];

	/** Lay out a cluster's members back to back and center them on their
	 *  highlights; returns that ideal top, before any floor is applied. */
	const ideal = (c: Cluster): number => {
		let sum = 0;
		let offset = 0;
		for (let i = c.first; i <= c.last; i++) {
			sum += (boxes[i]?.desired ?? 0) - offset;
			offset += (boxes[i]?.height ?? 0) + gap;
		}
		c.height = offset - gap;
		return sum / (c.last - c.first + 1);
	};

	boxes.forEach((_, i) => {
		const cur: Cluster = { first: i, last: i, top: 0, height: 0 };
		let want = ideal(cur);
		// Merge backwards while the cluster's ideal spot collides with the one before.
		for (;;) {
			const prev = clusters[clusters.length - 1];
			if (!prev || prev.top + prev.height + gap <= want) break;
			clusters.pop();
			cur.first = prev.first;
			want = ideal(cur);
		}
		const prev = clusters[clusters.length - 1];
		cur.top = Math.max(want, prev ? prev.top + prev.height + gap : 0, 0);
		clusters.push(cur);
	});

	const tops: number[] = [];
	for (const c of clusters) {
		let y = c.top;
		for (let i = c.first; i <= c.last; i++) {
			tops.push(y);
			y += (boxes[i]?.height ?? 0) + gap;
		}
	}
	return tops;
};

/**
 * Crowded margin notes in a PDF export: CSS floats can only stack a note below
 * the one before it, so a run of comments on nearby lines piles up downward.
 * Pull the first note of each crowded run up (a negative top margin) toward
 * where stackNotes would start it — centered on its highlights — but never
 * into the note above. Only that first note moves; the rest of the run still
 * stacks below it as floats, so notes can't overlap even if their heights
 * change after measuring, and they keep moving with their text across pages.
 * Run at the print page width.
 */
export const nudgeMarginNotes = (root: HTMLElement): void => {
	const notes = Array.from(root.querySelectorAll<HTMLElement>(".dc-print-note--margin"));
	if (notes.length < 2) return;
	for (const note of notes) note.setCssProps({ "--dc-note-shift": "0px" });
	const rootTop = root.getBoundingClientRect().top;
	const topOf = (el: Element): number => el.getBoundingClientRect().top - rootTop;
	const bottomOf = (el: Element): number => el.getBoundingClientRect().bottom - rootTop;
	const boxes = notes.map((note) => {
		// The note sits right before what it annotates: the highlight, or the
		// code block / table / callout / blockquote around it.
		const id = note.dataset.cid ?? "";
		let anchor = note.nextElementSibling;
		// Several notes can share one block; skip past the others.
		while (anchor?.classList.contains("dc-print-note--margin")) anchor = anchor.nextElementSibling;
		anchor ??= root.querySelector(`.doc-comment-span[data-cid="${CSS.escape(id)}"]`);
		return { desired: anchor ? topOf(anchor) : topOf(note), height: note.getBoundingClientRect().height };
	});
	const gap = parseFloat(getComputedStyle(notes[0] as HTMLElement).marginBottom) || 0;
	const tops = stackNotes(boxes, gap);
	// A note pushed below its highlight by the one before it is in a crowded
	// run; lift the note that starts the run, and the rest follow it.
	const pushed = notes.map((note, i) => topOf(note) > (boxes[i]?.desired ?? 0) + 1);
	notes.forEach((note, i) => {
		if (pushed[i] || !pushed[i + 1]) return;
		const natural = topOf(note);
		const prev = notes[i - 1];
		const room = prev ? natural - (bottomOf(prev) + gap + SAFETY) : natural;
		const lift = Math.min(natural - (tops[i] ?? natural), room);
		if (lift > 0.5) note.setCssProps({ "--dc-note-shift": `${-lift}px` });
	});
};
