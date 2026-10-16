/** Emoji grouped for the "+" picker, built from Unicode ranges with the
 *  browser's own emoji properties (no bundled emoji data). Each entry is ready
 *  to use as a reaction: text-style pictographs get the emoji presentation
 *  selector (U+FE0F) so they render as color emoji. */
export type EmojiGroup = { label: string; emoji: string[] };

const GROUPS: Array<{ label: string; ranges: Array<[number, number]> }> = [
	{
		label: "Smileys & people",
		ranges: [
			[0x1f600, 0x1f64f],
			[0x1f910, 0x1f92f],
			[0x1f970, 0x1f97f],
			[0x1f9d0, 0x1f9df],
			[0x1fae0, 0x1faef],
			[0x1f466, 0x1f487],
			[0x1f4aa, 0x1f4aa],
			[0x1f44a, 0x1f450],
			[0x1f590, 0x1f596],
			[0x1f918, 0x1f91f],
			[0x1f932, 0x1f93e],
			[0x1faf0, 0x1faff],
		],
	},
	{
		label: "Animals & nature",
		ranges: [
			[0x1f330, 0x1f343],
			[0x1f400, 0x1f43f],
			[0x1f980, 0x1f9ae],
			[0x1fab0, 0x1fabf],
		],
	},
	{
		label: "Food & drink",
		ranges: [
			[0x1f344, 0x1f37f],
			[0x1f950, 0x1f96f],
			[0x1f9c0, 0x1f9cf],
			[0x1fad0, 0x1fadf],
		],
	},
	{
		label: "Activities",
		ranges: [
			[0x1f380, 0x1f3ff],
			[0x26bd, 0x26be],
			[0x1f93f, 0x1f94f],
			[0x1fa80, 0x1fa8f],
		],
	},
	{
		label: "Travel & places",
		ranges: [
			[0x1f680, 0x1f6ff],
			[0x1f30d, 0x1f32f],
			[0x1f3d4, 0x1f3f0],
		],
	},
	{
		label: "Objects",
		ranges: [
			[0x1f4a0, 0x1f4ff],
			[0x1f500, 0x1f58f],
			[0x1f5a4, 0x1f5ff],
			[0x1f9e0, 0x1f9ff],
			[0x1fa70, 0x1fa7f],
			[0x1fa90, 0x1faaf],
		],
	},
	{
		label: "Symbols",
		ranges: [
			[0x2600, 0x26ff],
			[0x2700, 0x27bf],
			[0x2b00, 0x2bff],
			[0x1f300, 0x1f30c],
			[0x1f7e0, 0x1f7ff],
			[0x2190, 0x21ff],
			[0x2300, 0x23ff],
			[0x2190, 0x2199],
		],
	},
	// Catch-all for whole emoji blocks: anything not placed above lands here.
	{
		label: "More",
		ranges: [
			[0x1f000, 0x1f2ff],
			[0x1f300, 0x1f5ff],
			[0x1f600, 0x1f64f],
			[0x1f680, 0x1f6ff],
			[0x1f700, 0x1f7ff],
			[0x1f900, 0x1f9ff],
			[0x1fa70, 0x1faff],
			[0x2000, 0x2bff],
			[0x3000, 0x33ff],
		],
	},
];

const PRESENTATION = /\p{Emoji_Presentation}/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

let cache: EmojiGroup[] | null = null;

export const emojiGroups = (): EmojiGroup[] => {
	if (cache) return cache;
	const seen = new Set<string>();
	cache = GROUPS.map(({ label, ranges }) => {
		const emoji: string[] = [];
		for (const [from, to] of ranges) {
			for (let cp = from; cp <= to; cp++) {
				const ch = String.fromCodePoint(cp);
				let e: string | null = null;
				if (PRESENTATION.test(ch)) e = ch;
				else if (PICTOGRAPHIC.test(ch)) e = ch + "️";
				if (e && !seen.has(e)) {
					seen.add(e);
					emoji.push(e);
				}
			}
		}
		return { label, emoji };
	}).filter((g) => g.emoji.length > 0);
	return cache;
};

/** The first emoji the user typed or pasted (keeps ZWJ sequences, skin tones
 *  and flags whole), or null when there isn't one. */
/** One emoji: a flag (two regional indicators) or a pictograph with optional
 *  presentation selector, skin tone, and zero-width-joined parts. */
const EMOJI_SEQUENCE =
	/\p{Regional_Indicator}{2}|\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?)*/u;

export const firstEmoji = (text: string): string | null => EMOJI_SEQUENCE.exec(text)?.[0] ?? null;
