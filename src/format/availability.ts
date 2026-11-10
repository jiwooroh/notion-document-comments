import type { ParsedComment } from "./types";

/** Whether the comment feature is on (settings → Comments). Plugin-wide, set
 *  by DocCommentsPlugin.applyCommentsEnabled. While it's off, comments stay in
 *  the notes untouched but nothing shows or creates them; suggested edits
 *  (Suggesting mode) are a separate feature and keep working. */
let enabled = true;

export const setCommentsEnabled = (on: boolean): void => {
	enabled = on;
};

export const commentsEnabled = (): boolean => enabled;

/** The comments that may show right now: all of them, or only suggestions
 *  while the comment feature is off. */
export const shownComments = (comments: ParsedComment[]): ParsedComment[] => {
	return enabled ? comments : comments.filter((c) => c.suggest !== undefined);
};
