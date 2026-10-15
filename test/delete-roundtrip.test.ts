// Deleting a comment must give back exactly the note it was added to — only the
// markers and the body go, never the user's text or line breaks. Checked through
// CodeMirror too, since the editor applies the change set itself.
import { describe, expect, test } from "vitest";
import { EditorState } from "@codemirror/state";
import { applyChanges, computeAddComment, computeAppendReply, computeDeleteComment } from "../src/editor/edits";

const cases: Array<[string, string, string, string?]> = [
	["We gave him a hearty welcome; for there was nearly half.\n\nNext para.", "hearty welcome", "plain"],
	[
		"- Chat agents are multi-turn: cross-turn references, iterative refinement.\n- Full-context prompting fails.",
		"cross-turn references",
		"**Darkness** is associated ↔ **Light**\n---\n**Tension**",
	],
	["Para with arrow.\n", "arrow", "A --> B and <!-- inner --> stuff"],
	["Para one.\n", "one", '<span class="dc-fg-red">red</span> and <mark class="dc-mark-blue">blue</mark>'],
	["Para one.\n", "one", "text with <!--/c:k3f9--> marker-like content"],
	["Para one.\n", "one", "first", "reply with --> arrow"],
	["Line a\r\nLine b with words\r\nLine c", "with words", "crlf"],
	["# Heading\n\nText **bold part** end.\n", "bold part", "x"],
	// A selection that includes a line break (e.g. a triple-clicked line) puts a
	// marker on the blank line between paragraphs; deleting must keep that line.
	["Para A line.\n\nNext para.", "Para A line.\n", "triple-click line incl newline"],
	["Para A line.\nSecond line.\n\nNext para.", "Para A line.\nSecond line.\n", "two lines incl newline"],
	["Intro.\n\nWhole para.\n\nNext.", "\nWhole para.\n", "leading+trailing newline"],
	["Flow: a --> b here.\n", "a --> b", "quote has arrow"],
	["Before.\n\n- item one\n- item two\n\nAfter.", "- item one\n- item two", "whole list"],
	["```js\nconst a = 1;\nconst b = 2;\n```\n\nAfter.", "const a = 1;", "code"],
	["```js\nconst a = 1;\n```", "const a = 1;", "code at end of file"],
	["Text\n```js\nx\n```\nMore", "x", "code between lines"],
];

describe("deleting a comment restores the original note", () => {
	test.each(cases)("case %#", (doc, quote, text, reply) => {
		const from = doc.indexOf(quote);
		let withComment = applyChanges(
			doc,
			computeAddComment(doc, from, from + quote.length, {
				id: "k3f9",
				createdAt: "2026-10-15T00:00:00.000Z",
				author: "lucy",
				text,
			}).unwrap(),
		);
		if (reply) {
			withComment = applyChanges(
				withComment,
				computeAppendReply(withComment, "k3f9", {
					author: "lucy",
					createdAt: "2026-10-15T00:01:00.000Z",
					text: reply,
				}).unwrap(),
			);
		}
		const changes = computeDeleteComment(withComment, "k3f9").unwrap();
		expect(applyChanges(withComment, changes)).toBe(doc);
		// CodeMirror normalizes CRLF to LF, so the editor check only applies to LF notes.
		if (!doc.includes("\r")) {
			const viaEditor = EditorState.create({ doc: withComment }).update({ changes }).state.doc.toString();
			expect(viaEditor).toBe(doc);
		}
	});
});
