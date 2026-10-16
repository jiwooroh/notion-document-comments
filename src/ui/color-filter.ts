import type { ParsedComment } from "../format/types";
import { HIGHLIGHT_COLORS } from "./highlight-colors";

/** Filter key for a comment's color: its palette id, or "default" for none. */
export const DEFAULT_COLOR_KEY = "default";
export const colorKey = (c: Pick<ParsedComment, "color">): string => c.color ?? DEFAULT_COLOR_KEY;

/** Keep comments whose color is selected; an empty selection means all colors. */
export const filterByColors = <T extends Pick<ParsedComment, "color">>(
	comments: T[],
	selected: ReadonlySet<string>,
): T[] => (selected.size === 0 ? comments : comments.filter((c) => selected.has(colorKey(c))));

/** Colors used by these comments, in palette order (no color first), with counts. */
export const colorsPresent = (comments: Array<Pick<ParsedComment, "color">>): Array<{ key: string; count: number }> => {
	const counts = new Map<string, number>();
	for (const c of comments) counts.set(colorKey(c), (counts.get(colorKey(c)) ?? 0) + 1);
	const order = [DEFAULT_COLOR_KEY, ...HIGHLIGHT_COLORS.map((h) => h.id)];
	const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
	return Array.from(counts, ([key, count]) => ({ key, count })).sort((a, b) => rank(a.key) - rank(b.key));
};

/** Human label for a filter key. */
export const colorLabel = (key: string): string =>
	key === DEFAULT_COLOR_KEY ? "No color" : (HIGHLIGHT_COLORS.find((h) => h.id === key)?.label ?? key);

/** CSS color for a filter key's swatch (see the palette variables in styles.css). */
export const colorSwatch = (key: string): string =>
	key === DEFAULT_COLOR_KEY ? "var(--dc-highlight-border)" : `var(--dc-hl-${key}-border)`;
