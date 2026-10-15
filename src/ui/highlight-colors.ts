/**
 * Notion's highlight palette. Ids match the `--dc-hl-<id>` / `-border` / `-active`
 * custom properties defined in styles.css (light default on `:root`, dark override
 * under `body.theme-dark`) — this file only carries the ids/labels needed to build
 * the settings dropdown and to point `--dc-highlight-*` at the chosen one.
 */
export type HighlightColorDef = {
	id: string;
	label: string;
};

export const HIGHLIGHT_COLORS: HighlightColorDef[] = [
	{ id: "theme", label: "Theme default" },
	{ id: "yellow", label: "Yellow" },
	{ id: "green", label: "Green" },
	{ id: "blue", label: "Blue" },
	{ id: "purple", label: "Purple" },
	{ id: "pink", label: "Pink" },
	{ id: "red", label: "Red" },
	{ id: "orange", label: "Orange" },
	{ id: "brown", label: "Brown" },
	{ id: "gray", label: "Gray" },
];

export const DEFAULT_HIGHLIGHT_COLOR = "theme";

/** Default % of each color's own tone mixed into its pale base — see
 *  --dc-highlight-intensity in styles.css. 0 = Notion's exact fill color. */
export const DEFAULT_HIGHLIGHT_INTENSITY = 0;

/** The 9 named colors (excludes "theme", which has no pale/border pair of its
 *  own to customize — it derives entirely from the vault's theme instead). */
export const CUSTOMIZABLE_HIGHLIGHT_COLORS: HighlightColorDef[] = HIGHLIGHT_COLORS.filter((c) => c.id !== "theme");

/** Points the `--dc-highlight-*` variables at the chosen palette id's custom
 *  properties. Kept as a string reference (not a resolved hex), so it stays
 *  theme-aware automatically — `--dc-hl-<id>` itself already flips value under
 *  `body.theme-dark`, with no JS re-run needed on theme change. */
export const applyHighlightColor = (colorId: string): void => {
	const id = HIGHLIGHT_COLORS.some((c) => c.id === colorId) ? colorId : DEFAULT_HIGHLIGHT_COLOR;
	document.body.style.setProperty("--dc-highlight-bg", `var(--dc-hl-${id})`);
	document.body.style.setProperty("--dc-highlight-bg-active", `var(--dc-hl-${id}-active)`);
	document.body.style.setProperty("--dc-highlight-border", `var(--dc-hl-${id}-border)`);
};

/** Sets how strongly each of the 9 colors' own tone mixes into its pale base
 *  (see --dc-highlight-intensity in styles.css) — the "opacity" slider in
 *  settings. Affects every color at once, since it's one shared mix ratio. */
export const applyHighlightIntensity = (percent: number): void => {
	document.body.style.setProperty("--dc-highlight-intensity", `${percent}%`);
};

export type ColorScheme = "notion" | "apple";

export const COLOR_SCHEMES: Array<{ id: ColorScheme; label: string }> = [
	{ id: "notion", label: "Notion" },
	{ id: "apple", label: "Apple" },
];

export const DEFAULT_COLOR_SCHEME: ColorScheme = "notion";

/** Switches the 9 colors between palettes with a body class (see styles.css's
 *  `body.dc-scheme-apple` blocks); Notion needs no class. */
export const applyColorScheme = (scheme: string): void => {
	document.body.classList.toggle("dc-scheme-apple", scheme === "apple");
};

type Swatch = { bg: string; fg: string };
type Palette = Record<string, Record<"light" | "dark", Swatch>>;

/** Each scheme's palette per theme: `bg` is the highlight fill, `fg` the text
 *  tone (underline, hover, colored comment text). Mirrors the --dc-hl-<id>-pale
 *  / -border values in styles.css — keep the two in sync. Used to show each
 *  color's default in the settings color pickers. Apple's fills are
 *  translucent (#RRGGBBAA). */
const PALETTES: Record<ColorScheme, Palette> = {
	notion: {
		gray: { light: { bg: "#F1F1EF", fg: "#787774" }, dark: { bg: "#2F2F2F", fg: "#9B9B9B" } },
		brown: { light: { bg: "#F3EEEE", fg: "#976D57" }, dark: { bg: "#46332A", fg: "#B28773" } },
		orange: { light: { bg: "#F8ECDF", fg: "#CC782F" }, dark: { bg: "#573C27", fg: "#BD8052" } },
		yellow: { light: { bg: "#FAF3DE", fg: "#C29343" }, dark: { bg: "#53442C", fg: "#C29A56" } },
		green: { light: { bg: "#EEF3EC", fg: "#548164" }, dark: { bg: "#2A3C31", fg: "#659C75" } },
		blue: { light: { bg: "#E9F3F7", fg: "#487CA5" }, dark: { bg: "#1E394C", fg: "#6786C4" } },
		purple: { light: { bg: "#F6F3F9", fg: "#8A67AB" }, dark: { bg: "#3A2E47", fg: "#956ACD" } },
		pink: { light: { bg: "#FDE8F1", fg: "#B35388" }, dark: { bg: "#492E3B", fg: "#C25F94" } },
		red: { light: { bg: "#FAECEC", fg: "#C4554D" }, dark: { bg: "#4D302B", fg: "#CF5D57" } },
	},
	apple: {
		gray: { light: { bg: "#9898A026", fg: "#9898A0" }, dark: { bg: "#A0A0A726", fg: "#A0A0A7" } },
		brown: { light: { bg: "#B38C6526", fg: "#B38C65" }, dark: { bg: "#B8946F26", fg: "#B8946F" } },
		orange: { light: { bg: "#F0934326", fg: "#F09343" }, dark: { bg: "#F0974826", fg: "#F09748" } },
		yellow: { light: { bg: "#F4C24233", fg: "#F4C242" }, dark: { bg: "#F6CE5526", fg: "#F6CE55" } },
		green: { light: { bg: "#30CF6A26", fg: "#30CF6A" }, dark: { bg: "#51DB8426", fg: "#51DB84" } },
		blue: { light: { bg: "#3869F026", fg: "#3869F0" }, dark: { bg: "#598BF826", fg: "#598BF8" } },
		purple: { light: { bg: "#BB3ED926", fg: "#BB3ED9" }, dark: { bg: "#CA43EA26", fg: "#CA43EA" } },
		pink: { light: { bg: "#ED358E26", fg: "#ED358E" }, dark: { bg: "#F75FA826", fg: "#F75FA8" } },
		red: { light: { bg: "#DE2E2126", fg: "#DE2E21" }, dark: { bg: "#EC5F5526", fg: "#EC5F55" } },
	},
};

/** Page background a translucent fill is shown over, for the picker preview. */
const PAGE_BG = { light: "#FFFFFF", dark: "#1E1E1E" };

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** A palette id's default highlight in one scheme and theme at a given
 *  intensity, as an opaque hex for a color picker: a translucent fill is first
 *  composited over the page background, then mixed toward the text tone like
 *  styles.css's `color-mix(in srgb, fill, tone <intensity>%)`. */
export const defaultHighlightHex = (
	id: string,
	theme: "light" | "dark",
	intensity: number,
	scheme: string = DEFAULT_COLOR_SCHEME,
): string => {
	const entry = (PALETTES[scheme as ColorScheme] ?? PALETTES.notion)[id]?.[theme];
	if (!entry) return "#000000";
	const alpha = entry.bg.length === 9 ? parseInt(entry.bg.slice(7, 9), 16) / 255 : 1;
	const page = channels(PAGE_BG[theme]);
	const fill = channels(entry.bg).map((c, i) => c * alpha + (page[i] ?? 0) * (1 - alpha));
	const tone = channels(entry.fg);
	const t = Math.min(Math.max(intensity, 0), 100) / 100;
	return (
		"#" +
		fill
			.map((c, i) => Math.round(c + ((tone[i] ?? c) - c) * t))
			.map((c) => c.toString(16).padStart(2, "0"))
			.join("")
	);
};

/** Applies (or clears) a hand-picked hex override for individual colors, on
 *  top of the intensity-derived default — same override-on-<body> pattern the
 *  sibling Notion Selection Toolbar plugin uses for its own highlight colors.
 *  Picks the light or dark map by the theme currently on <body>. */
export const applyCustomHighlightColors = (light: Record<string, string>, dark: Record<string, string>): void => {
	const active = document.body.classList.contains("theme-dark") ? dark : light;
	for (const c of CUSTOMIZABLE_HIGHLIGHT_COLORS) {
		const custom = active[c.id];
		if (custom) document.body.style.setProperty(`--dc-hl-${c.id}`, custom);
		else document.body.style.removeProperty(`--dc-hl-${c.id}`);
	}
};

/** How a comment's anchor is marked in the text: a filled highlight (the
 *  default), just a quiet underline with no fill — for people who find a page
 *  full of colored blocks distracting — or both together. */
export type AnnotationStyleDef = {
	id: string;
	label: string;
};

export const ANNOTATION_STYLES: AnnotationStyleDef[] = [
	{ id: "highlight", label: "Highlight" },
	{ id: "underline", label: "Underline" },
	{ id: "both", label: "Highlight + underline" },
];

export const DEFAULT_ANNOTATION_STYLE = "highlight";

/** Sets the plugin-wide anchor style with a body class (see styles.css's
 *  `body.dc-annotation-*` rules): no class means fill only, `underline` drops
 *  the fill and shows the underline, `both` shows both. Hovering an anchor
 *  still shows its momentary active color in every mode. */
export const applyAnnotationStyle = (style: string): void => {
	document.body.classList.toggle("dc-annotation-underline", style === "underline");
	document.body.classList.toggle("dc-annotation-both", style === "both");
};
