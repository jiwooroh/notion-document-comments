import { describe, expect, test } from "vitest";
import { applyChanges, computeResolveAllSuggestions, computeResolveSuggestion } from "../src/editor/edits";
import { Direction, EditInput, planSuggestedEdits, planWrapPending } from "../src/editor/suggest";
import { parseComments } from "../src/format/parse";

const ctx = { author: "me", createdAt: "2026-10-28T00:00:00.000Z" };

/** Apply one user edit in Suggesting mode; returns the new doc and caret. */
const run = (doc: string, edits: EditInput[], direction: Direction = "none") => {
	const plan = planSuggestedEdits(doc, edits, ctx, direction);
	const mid = applyChanges(doc, plan.changes);
	return { doc: applyChanges(mid, plan.followUp), mid, caret: plan.carets[0] ?? -1 };
};

/** The document as a reader sees it, with suggestions spelled out. */
const view = (doc: string): string => {
	let out = doc;
	for (const c of parseComments(doc)) {
		if (!c.suggest) continue;
		const tag = c.suggest === "insert" ? "+" : "-";
		out = out.replace(`<!--c:${c.id}-->`, `{${tag}`).replace(`<!--/c:${c.id}-->`, `${tag}}`);
	}
	return out.replace(/\n<!--co:[\s\S]*?-->/g, "");
};

const type = (doc: string, at: number, text: string) => run(doc, [{ from: at, to: at, insert: text }]);

describe("suggesting mode", () => {
	test("typing creates an insertion suggestion with a body", () => {
		const { doc, caret } = type("Hello world", 5, " big");
		expect(view(doc)).toBe("Hello{+ big+} world");
		const [c] = parseComments(doc);
		expect(c?.suggest).toBe("insert");
		expect(c?.author).toBe("me");
		expect(c?.quote).toBe("big");
		expect(c?.text).toBe(" big");
		// Caret sits after the typed text, before the closing marker.
		expect(doc.slice(0, caret).endsWith(" big")).toBe(true);
	});

	test("continued typing grows the same suggestion", () => {
		const first = type("Hello world", 5, " b");
		const second = type(first.doc, first.caret, "ig");
		expect(view(second.doc)).toBe("Hello{+ big+} world");
		expect(parseComments(second.doc)).toHaveLength(1);
		expect(parseComments(second.doc)[0]?.text).toBe(" big");
	});

	test("typing right after your suggestion's closing marker joins it", () => {
		const first = type("Hello world", 5, " b");
		const close = first.doc.indexOf("-->", first.doc.indexOf("<!--/c:")) + 3;
		const second = type(first.doc, close, "ig");
		expect(view(second.doc)).toBe("Hello{+ big+} world");
	});

	test("deleting text marks it instead of removing it", () => {
		const { doc } = run("Hello big world", [{ from: 5, to: 9, insert: "" }]);
		expect(view(doc)).toBe("Hello{- big-} world");
		expect(parseComments(doc)[0]?.suggest).toBe("delete");
	});

	test("backspacing repeatedly extends one deletion", () => {
		let state = { doc: "Hello world", caret: 11 };
		for (let i = 0; i < 3; i++) {
			const r = run(state.doc, [{ from: state.caret - 1, to: state.caret, insert: "" }], "backward");
			state = { doc: r.doc, caret: r.caret };
		}
		expect(view(state.doc)).toBe("Hello wo{-rld-}");
		expect(parseComments(state.doc)).toHaveLength(1);
		expect(parseComments(state.doc)[0]?.quote).toBe("rld");
	});

	test("forward delete repeatedly extends one deletion", () => {
		let state = { doc: "Hello world", caret: 0 };
		for (let i = 0; i < 3; i++) {
			const r = run(state.doc, [{ from: state.caret, to: state.caret + 1, insert: "" }], "forward");
			state = { doc: r.doc, caret: r.caret };
		}
		expect(view(state.doc)).toBe("{-Hel-}lo world");
		expect(parseComments(state.doc)).toHaveLength(1);
	});

	test("deleting your own suggested text really deletes it", () => {
		const first = type("Hello world", 5, " big");
		const second = run(first.doc, [{ from: first.caret - 1, to: first.caret, insert: "" }], "backward");
		expect(view(second.doc)).toBe("Hello{+ bi+} world");
	});

	test("deleting all of your suggested text removes the suggestion", () => {
		const first = type("Hello world", 5, "!");
		const second = run(first.doc, [{ from: first.caret - 1, to: first.caret, insert: "" }], "backward");
		expect(second.doc).toBe("Hello world");
	});

	test("typing over a selection suggests a replacement", () => {
		const { doc } = run("Hello big world", [{ from: 6, to: 9, insert: "small" }]);
		expect(view(doc)).toBe("Hello {-big-}{+small+} world");
	});

	test("typing inside struck text goes after the deletion", () => {
		const first = run("Hello big world", [{ from: 6, to: 9, insert: "" }]);
		const inner = first.doc.indexOf("big") + 1;
		const second = type(first.doc, inner, "x");
		expect(view(second.doc)).toBe("Hello {-big-}{+x+} world");
	});

	test("deleting already-struck text changes nothing", () => {
		const first = run("Hello big world", [{ from: 6, to: 9, insert: "" }]);
		const at = first.doc.indexOf("big") + 2;
		const second = run(first.doc, [{ from: at - 1, to: at, insert: "" }], "backward");
		expect(second.doc).toBe(first.doc);
		expect(second.caret).toBe(at - 1);
	});

	test("code, front matter and link targets are edited directly", () => {
		expect(type("a `code` b", 4, "X").doc).toBe("a `cXode` b");
		expect(type("---\ntitle: x\n---\nbody", 11, "y").doc).toBe("---\ntitle: yx\n---\nbody");
		expect(type("see [[Note]] now", 7, "X").doc).toBe("see [[NXote]] now");
	});

	test("a deletion keeps a comment's markers inside it", () => {
		const doc = "one <!--c:ab12c-->two<!--/c:ab12c--> three\n<!--co:ab12c by:x status:open\nx: hi\n-->";
		// Deleting "one two" across the comment's opening marker.
		const opener = doc.indexOf("<!--c:ab12c-->");
		const pieces = run(doc, [
			{ from: 0, to: opener, insert: "" },
			{ from: opener + "<!--c:ab12c-->".length, to: opener + "<!--c:ab12c-->".length + 3, insert: "" },
		]);
		const suggestions = parseComments(pieces.doc).filter((c) => c.suggest === "delete");
		expect(suggestions).toHaveLength(1);
		expect(suggestions[0]?.text).toBe("one two");
	});

	test("composed text is wrapped once the IME is done", () => {
		const typed = "안녕 하세요 세상";
		const [changes = [], followUp = []] = planWrapPending(typed, [{ from: 3, to: 7 }], ctx);
		const out = applyChanges(applyChanges(typed, changes), followUp);
		expect(view(out)).toBe("안녕 {+하세요 +}세상");
	});

	test("text a composition replaced comes back struck through before the new text", () => {
		// "안녕 세상" with "세상" selected, then "하나" composed over it.
		const typed = "안녕 하나";
		const [changes = [], followUp = []] = planWrapPending(typed, [{ from: 3, to: 5 }], ctx, [
			{ pos: 3, text: "세상" },
		]);
		const out = applyChanges(applyChanges(typed, changes), followUp);
		expect(view(out)).toBe("안녕 {-세상-}{+하나+}");
	});
});

describe("accepting and rejecting", () => {
	const inserted = type("Hello world", 5, " big").doc;
	const deleted = run("Hello big world", [{ from: 5, to: 9, insert: "" }]).doc;
	const id = (doc: string) => parseComments(doc)[0]?.id ?? "";

	test("accept / reject an insertion", () => {
		expect(applyChanges(inserted, computeResolveSuggestion(inserted, id(inserted), true).unwrap())).toBe(
			"Hello big world",
		);
		expect(applyChanges(inserted, computeResolveSuggestion(inserted, id(inserted), false).unwrap())).toBe(
			"Hello world",
		);
	});

	test("accept / reject a deletion", () => {
		expect(applyChanges(deleted, computeResolveSuggestion(deleted, id(deleted), true).unwrap())).toBe(
			"Hello world",
		);
		expect(applyChanges(deleted, computeResolveSuggestion(deleted, id(deleted), false).unwrap())).toBe(
			"Hello big world",
		);
	});

	test("accept all / reject all", () => {
		const replaced = run("Hello big world", [{ from: 6, to: 9, insert: "small" }]).doc;
		expect(applyChanges(replaced, computeResolveAllSuggestions(replaced, true).unwrap())).toBe("Hello small world");
		expect(applyChanges(replaced, computeResolveAllSuggestions(replaced, false).unwrap())).toBe("Hello big world");
	});

	test("rejecting an insertion keeps a comment that reaches outside it", () => {
		const doc = type("Hello world", 5, " big").doc;
		const ins = parseComments(doc)[0];
		// A comment from inside the suggestion to the end of the line.
		const start = (ins?.open?.to ?? 0) + 1;
		const withComment =
			doc.slice(0, start) +
			"<!--c:zz9zz-->" +
			doc.slice(start, doc.indexOf("\n")) +
			"<!--/c:zz9zz-->" +
			doc.slice(doc.indexOf("\n")) +
			"\n<!--co:zz9zz by:x status:open\nx: note\n-->";
		const out = applyChanges(withComment, computeResolveSuggestion(withComment, ins?.id ?? "", false).unwrap());
		expect(out).toBe("Hello<!--c:zz9zz--> world<!--/c:zz9zz-->\n<!--co:zz9zz by:x status:open\nx: note\n-->");
	});
});
