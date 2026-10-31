import { HIGHLIGHT_RULES } from "./highlight-rules";

// Chromium can restyle the whole editor for every custom highlight selector,
// even if its highlight does not exist. Keep only currently registered names.
const styles = new WeakMap<Document, { element: HTMLStyleElement; signature: string }>();

export const cssForHighlights = (names: ReadonlySet<string>): string =>
	HIGHLIGHT_RULES.filter((rule) => rule.names.some((name) => names.has(name)))
		.map((rule) => rule.css)
		.join("\n");

export const syncHighlightStyles = (doc: Document): void => {
	const registry = doc.defaultView?.CSS?.highlights;
	if (!registry) return;
	const names = new Set<string>();
	for (const name of registry.keys()) {
		if (name.startsWith("notion-style-comments-table") || name.startsWith("nsc-html-")) names.add(name);
	}
	const signature = [...names].sort().join("|");
	const existing = styles.get(doc);
	if (existing?.signature === signature) return;
	if (names.size === 0) {
		existing?.element.remove();
		styles.delete(doc);
		return;
	}
	const element = existing?.element ?? doc.createElement("style");
	if (!existing) {
		element.dataset.nscDynamicHighlights = "true";
		doc.head.appendChild(element);
	}
	element.textContent = cssForHighlights(names);
	styles.set(doc, { element, signature });
};
