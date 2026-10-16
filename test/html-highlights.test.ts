// @vitest-environment happy-dom
//
// In Live Preview, inline HTML in commented text renders as a non-editable
// widget over the source, so the normal highlight can't show there. The editor
// finds the commented text inside that widget (findRenderedMatch) and paints the
// widget's parts with CSS highlights named by color and style (highlightName).
import { describe, expect, test } from "vitest";
import { findRenderedMatch } from "../src/reading/highlight";
import { highlightName } from "../src/editor/html-highlights";

const line = (html: string): HTMLElement => {
	const el = document.createElement("div");
	el.className = "cm-line";
	el.innerHTML = html;
	return el;
};
const insideWidget = (root: HTMLElement, source: string): string =>
	(findRenderedMatch(root, source) ?? [])
		.filter((p) => p.node.parentElement?.closest('[contenteditable="false"]'))
		.map((p) => p.node.data.slice(p.from, p.to))
		.join("|");

describe("commented text inside rendered inline HTML", () => {
	test("text wrapped entirely in <span><strong>", () => {
		const root = line(
			'<span class="dc-comment-marker">​</span><span contenteditable="false"><span class="nst-fg-red"><strong>Gill’s anecdote demonstrates it</strong></span></span><span class="dc-comment-marker">​</span>. Gill intends',
		);
		const src = '<span class="nst-fg-red"><strong>Gill’s anecdote demonstrates it</strong></span>';
		expect(insideWidget(root, src)).toBe("Gill’s anecdote demonstrates it");
	});

	test("text partly inside <strong> and <span>: only the HTML parts need painting", () => {
		const root = line(
			'From this perspective, <span contenteditable="false"><strong>characters matter less</strong></span> as individuals than as <span contenteditable="false"><span class="nst-fg-red">positions within a system</span></span>.',
		);
		const src =
			'From this perspective, <strong>characters matter less</strong> as individuals than as <span class="nst-fg-red">positions within a system</span>.';
		expect(insideWidget(root, src)).toBe("characters matter less|positions within a system");
	});

	test("a <mark> wrapper", () => {
		const root = line(
			'leave. <span contenteditable="false"><mark class="nst-hl-gray">In the end, both are defeated.</mark></span> The status',
		);
		expect(insideWidget(root, '<mark class="nst-hl-gray">In the end, both are defeated.</mark>')).toBe(
			"In the end, both are defeated.",
		);
	});

	test("highlight names follow color, style and resolved state", () => {
		expect(highlightName(undefined, undefined, false)).toBe("nsc-html-default-default");
		expect(highlightName("red", "underline", false)).toBe("nsc-html-red-underline");
		expect(highlightName("red", "both", true)).toBe("nsc-html-resolved");
	});
});
