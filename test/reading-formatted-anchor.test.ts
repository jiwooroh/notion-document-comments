// @vitest-environment happy-dom
//
// Reading view must find a comment's anchor even when the commented text has
// Markdown formatting in it (bold, links, ==highlight==, …) or crosses a
// formatting boundary — otherwise no highlight is added and the card for that
// comment never shows. The editor works on the source, so it never had this gap.
import { describe, expect, test } from "vitest";
import type { MarkdownPostProcessorContext } from "obsidian";
import { highlightPostProcessor } from "../src/reading/highlight";

Node.prototype.createSpan ??= function (o?: { cls?: string }) {
	const el = document.createElement("span");
	if (o?.cls) el.className = o.cls;
	this.appendChild(el);
	return el;
};
Node.prototype.detach ??= function () {
	this.parentNode?.removeChild(this);
};
const ctxFor = (text: string): MarkdownPostProcessorContext =>
	({
		getSectionInfo: () => ({ text, lineStart: 0, lineEnd: 0 }),
		sourcePath: "x",
	}) as unknown as MarkdownPostProcessorContext;

const body = (id: string, q: string) =>
	`\n<!--co:${id} by:me at:2026-01-01T00:00:00.000Z status:open quote:"${q}"\nme: hi\n-->`;
const cases: Array<[string, string, string]> = [
	["plain", "We <!--c:a1-->ship on Friday<!--/c:a1--> ok." + body("a1", "x"), "We ship on Friday ok."],
	[
		"bold inside",
		"We <!--c:a1-->ship **on** Friday<!--/c:a1--> ok." + body("a1", "x"),
		"We ship <strong>on</strong> Friday ok.",
	],
	[
		"across bold edge",
		"We ship <!--c:a1-->on **Fri**day<!--/c:a1--> ok." + body("a1", "x"),
		"We ship on <strong>Fri</strong>day ok.",
	],
	[
		"link",
		"See <!--c:a1-->the [docs](http://x) now<!--/c:a1-->." + body("a1", "x"),
		'See the <a href="http://x">docs</a> now.',
	],
	[
		"wikilink",
		"See <!--c:a1-->the [[Page|docs]] now<!--/c:a1-->." + body("a1", "x"),
		'See the <a class="internal-link">docs</a> now.',
	],
	["obsidian highlight", "A <!--c:a1-->==key== idea<!--/c:a1-->." + body("a1", "x"), "A <mark>key</mark> idea."],
	[
		"soft line break",
		"line one <!--c:a1-->ends\nand starts<!--/c:a1--> two" + body("a1", "x"),
		"line one ends\nand starts two",
	],
	["italic", "It <!--c:a1-->is *very* odd<!--/c:a1-->." + body("a1", "x"), "It is <em>very</em> odd."],
];
test.each(cases)("highlights an anchor with %s", (_name, md, html) => {
	const el = document.createElement("p");
	el.innerHTML = html;
	highlightPostProcessor(el, ctxFor(md));
	expect(el.querySelector(".doc-comment-span[data-cid='a1']")).not.toBeNull();
});

test("highlights every piece of an anchor that crosses formatting", () => {
	const el = document.createElement("p");
	el.innerHTML = "We ship on <strong>Fri</strong>day ok.";
	highlightPostProcessor(el, ctxFor("We ship <!--c:a1-->on **Fri**day<!--/c:a1--> ok." + body("a1", "x")));
	const text = [...el.querySelectorAll(".doc-comment-span[data-cid='a1']")].map((s) => s.textContent).join("");
	expect(text).toBe("on Friday");
});

describe("overlapping comments", () => {
	const two = (md: string, html: string) => {
		const el = document.createElement("p");
		el.innerHTML = html;
		const doc = md + body("a1", "x") + body("b2", "y");
		highlightPostProcessor(el, ctxFor(doc));
		const textOf = (id: string) =>
			[...el.querySelectorAll(`.doc-comment-span[data-cid='${id}']`)].map((s) => s.textContent).join("");
		return { a: textOf("a1"), b: textOf("b2") };
	};

	test("a comment inside another", () => {
		const r = two(
			"We <!--c:a1-->ship <!--c:b2-->on Friday<!--/c:b2--> anyway<!--/c:a1--> ok.",
			"We ship on Friday anyway ok.",
		);
		expect(r.a).toContain("ship");
		expect(r.b).toBe("on Friday");
	});

	test("two comments that partly overlap", () => {
		const r = two("We <!--c:a1-->ship <!--c:b2-->on<!--/c:a1--> Friday<!--/c:b2--> ok.", "We ship on Friday ok.");
		expect(r.a).toBe("ship on");
		expect(r.b).toBe("on Friday");
	});

	test("the same text commented twice", () => {
		const r = two("We <!--c:a1--><!--c:b2-->ship<!--/c:b2--><!--/c:a1--> ok.", "We ship ok.");
		expect(r.a).toBe("ship");
		expect(r.b).toBe("ship");
	});
});

describe("anchors from real notes", () => {
	const textOf = (el: HTMLElement, id: string) =>
		[...el.querySelectorAll(`.doc-comment-span[data-cid='${id}']`)].map((s) => s.textContent).join("");

	test("an anchor that runs across two blockquote lines", () => {
		const md =
			"> stare at it. <!--c:a1-->It looks, his name looks as \n> if it could stand some working on.<!--/c:a1-->" +
			body("a1", "x");
		const el = document.createElement("blockquote");
		el.innerHTML = "<p>stare at it. It looks, his name looks as<br>\nif it could stand some working on.</p>";
		highlightPostProcessor(el, ctxFor(md));
		expect(textOf(el, "a1").replace(/\s+/g, " ")).toBe(
			"It looks, his name looks as if it could stand some working on.",
		);
	});

	test("a comment whose start marker was lost still shows, found by its quote", () => {
		const md =
			"Botsford came. Humiliating enough to have buried it. <!--/c:a1-->Botsford came to my rescue.\n" +
			'<!--co:a1 by:me at:2026-01-01T00:00:00.000Z status:open quote:"Humiliating enough to have buried it."\nme: hi\n-->';
		const el = document.createElement("p");
		el.innerHTML = "Botsford came. Humiliating enough to have buried it. Botsford came to my rescue.";
		highlightPostProcessor(el, ctxFor(md));
		expect(textOf(el, "a1")).toBe("Humiliating enough to have buried it.");
	});

	test("a lost-marker comment whose quote kept inline HTML", () => {
		const md =
			'purpose: to expose the work\'s <mark class="nst-hl-red">organic <span class="nst-fg-red">unity</span></mark>.<!--/c:a1-->\n' +
			"<!--co:a1 by:me at:2026-01-01T00:00:00.000Z status:open quote:\"organic <span class='nst-fg-red'>unity</span>.\"\nme: hi\n-->";
		const el = document.createElement("p");
		el.innerHTML =
			'purpose: to expose the work\'s <mark class="nst-hl-red">organic <span class="nst-fg-red">unity</span></mark>.';
		highlightPostProcessor(el, ctxFor(md));
		expect(textOf(el, "a1")).toBe("organic unity.");
	});
});
