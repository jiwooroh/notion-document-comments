export type CommentStatus = "open" | "resolved";

/** A suggested edit (Suggesting mode): the anchored text is a proposed
 *  insertion, or text proposed for deletion. Accepting or rejecting it
 *  applies the edit or drops it (see editor/edits.ts). */
export type SuggestionKind = "insert" | "delete";

export type ThreadEntry = {
	author: string;
	/** ISO-8601 timestamp, optional (the first entry usually carries it via the header). */
	timestamp?: string;
	text: string;
};

export type Reaction = {
	emoji: string;
	authors: string[];
};

/** The content of a comment, independent of where it sits in the document. */
export type CommentData = {
	author?: string;
	createdAt?: string;
	status: CommentStatus;
	/** Redundant copy of the anchored text — the re-anchor fallback. */
	quote?: string;
	/** Present only for a comment anchored to lines inside a fenced code block.
	 *  The markers wrap the whole block; these are the block-relative line indices
	 *  (0-based, inclusive) the comment actually targets. `quote` is the re-anchor
	 *  key; these lines are the fast path and the disambiguator. */
	codeLines?: TextRange;
	/** Palette id (see ui/highlight-colors.ts) overriding this comment's highlight.
	 *  Absent means "follow the plugin-wide default" (settings → Highlight color). */
	color?: string;
	/** Annotation-style id ("highlight" or "underline", see ui/highlight-colors.ts)
	 *  overriding this comment's anchor style. Absent means "follow the plugin-wide
	 *  default" (settings → Annotation style) — same override pattern as `color`. */
	style?: string;
	/** Present when this "comment" is a suggested edit rather than a remark. */
	suggest?: SuggestionKind;
	/** On an insertion: the id of the deletion it replaces (typed over a
	 *  selection, or right after deleting). The pair shows as one "Replace"
	 *  card and is accepted or rejected together. */
	replaces?: string;
	thread: ThreadEntry[];
	reactions: Reaction[];
};

export type TextRange = {
	from: number;
	to: number;
};

/** A comment as found in a document, with resolved offsets for each piece. */
export type ParsedComment = {
	id: string;
	/** `<!--c:ID-->` marker range, or null if missing. */
	open: TextRange | null;
	/** `<!--/c:ID-->` marker range, or null if missing. */
	close: TextRange | null;
	/** `<!--co:ID ...-->` body block range, or null if missing. */
	body: TextRange | null;
	/** A suggestion's current anchored text (between its markers), read live
	 *  from the document — `quote` is only the re-anchor fallback. */
	text?: string;
	/** On an insertion that replaces a deletion: that deletion's live text. */
	replacedText?: string;
} & CommentData;
