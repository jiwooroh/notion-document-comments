import type { ParsedComment } from "./types";

/** Whether hover previews lead with the author's name. Plugin-wide, set from
 *  the "Show author names" setting (see DocCommentsPlugin.applyAuthorVisibility). */
let showAuthor = true;
export const setPreviewShowsAuthor = (show: boolean): void => {
	showAuthor = show;
};

export const commentPreview = (comment: ParsedComment): string | null => {
	const first = comment.thread[0];
	if (!first) return comment.suggest ? suggestionPreview(comment) : null;
	const text = first.text.trim().replace(/\s+/g, " ");
	if (!text) return null;
	if (!showAuthor) return text;
	const author = first.author || comment.author || "Comment";
	return `${author}: ${text}`;
};

/** "Add “…”" / "Delete “…”" for a suggestion with no replies yet. */
const suggestionPreview = (comment: ParsedComment): string => {
	const short = (s: string) => {
		const raw = s.trim().replace(/\s+/g, " ");
		return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
	};
	const text = short(comment.text ?? comment.quote ?? "");
	const line =
		comment.replacedText !== undefined
			? `Replace “${short(comment.replacedText)}” with “${text}”`
			: `${comment.suggest === "insert" ? "Add" : "Delete"} ${text ? `“${text}”` : "line break"}`;
	return showAuthor && comment.author ? `${comment.author}: ${line}` : line;
};
