// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { cssForHighlights, syncHighlightStyles } from "../src/editor/highlight-styles";

describe("on-demand highlight styles", () => {
	test("does not install highlight selectors when none are registered", () => {
		expect(cssForHighlights(new Set())).toBe("");
	});
	test("keeps all table styles without unrelated html colors", () => {
		const css = cssForHighlights(new Set(["notion-style-comments-table"]));
		expect(css).toContain("::highlight(notion-style-comments-table)");
		expect(css).not.toContain("::highlight(nsc-html-red-default)");
	});
	test("includes grouped rules for a registered selector", () => {
		const css = cssForHighlights(new Set(["nsc-html-red-highlight"]));
		expect(css).toContain("::highlight(nsc-html-red-highlight)");
		expect(css).not.toContain("::highlight(nsc-html-blue-highlight)");
	});
	test("installs and removes styles as the document registry changes", () => {
		const names = new Map<string, unknown>();
		const doc = document.implementation.createHTMLDocument("highlight test");
		Object.defineProperty(doc, "defaultView", { value: { CSS: { highlights: names } } });
		syncHighlightStyles(doc);
		expect(doc.head.querySelector("style")).toBeNull();
		names.set("nsc-html-red-highlight", {});
		syncHighlightStyles(doc);
		const style = doc.head.querySelector("style");
		expect(style?.textContent).toContain("::highlight(nsc-html-red-highlight)");
		syncHighlightStyles(doc);
		expect(doc.head.querySelectorAll("style")).toHaveLength(1);
		names.delete("nsc-html-red-highlight");
		syncHighlightStyles(doc);
		expect(doc.head.querySelector("style")).toBeNull();
	});
});
