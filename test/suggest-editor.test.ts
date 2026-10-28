// @vitest-environment happy-dom
//
// Suggesting mode through a real EditorState: the transaction filter must turn
// user input events into suggestions while leaving the plugin's own edits and
// Editing mode alone.
import { describe, expect, test } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { commentField } from "../src/editor/state";
import { commentConfig } from "../src/editor/config";
import { suggestExtension } from "../src/editor/suggest";
import { parseComments } from "../src/format/parse";

const make = (doc: string, cursor: number, suggesting = true) =>
	EditorState.create({
		doc,
		selection: EditorSelection.cursor(cursor),
		extensions: [
			commentField,
			suggestExtension,
			commentConfig.of({
				author: () => "me",
				showComments: () => true,
				showResolved: () => true,
				allowEmptyComments: () => false,
				sidebarOpen: () => false,
				suggesting: () => suggesting,
			}),
		],
	});

const typeChars = (state: EditorState, text: string): EditorState => {
	for (const ch of text) {
		const at = state.selection.main.head;
		state = state.update({
			changes: { from: at, insert: ch },
			selection: { anchor: at + 1 },
			userEvent: "input.type",
		}).state;
	}
	return state;
};

const backspace = (state: EditorState): EditorState => {
	const at = state.selection.main.head;
	return state.update({
		changes: { from: at - 1, to: at },
		selection: { anchor: at - 1 },
		userEvent: "delete.backward",
	}).state;
};

const visible = (state: EditorState): string => {
	let out = state.doc.toString();
	for (const c of parseComments(out)) {
		const tag = c.suggest === "insert" ? "+" : "-";
		out = out.replace(`<!--c:${c.id}-->`, `{${tag}`).replace(`<!--/c:${c.id}-->`, `${tag}}`);
	}
	return out.replace(/\n<!--co:[\s\S]*?-->/g, "");
};

describe("suggesting mode in the editor", () => {
	test("typed characters gather into one insertion", () => {
		const state = typeChars(make("Hello world", 5), " big");
		expect(visible(state)).toBe("Hello{+ big+} world");
		expect(parseComments(state.doc.toString())).toHaveLength(1);
	});

	test("backspace strikes text through, one growing deletion", () => {
		let state = make("Hello world", 11);
		for (let i = 0; i < 5; i++) state = backspace(state);
		expect(visible(state)).toBe("Hello {-world-}");
		expect(state.selection.main.head).toBe("Hello ".length);
	});

	test("backspace then typing suggests a replacement", () => {
		let state = make("Hello world", 11);
		for (let i = 0; i < 5; i++) state = backspace(state);
		state = typeChars(state, "there");
		expect(visible(state)).toBe("Hello {-world-}{+there+}");
	});

	test("an auto-paired bracket keeps the caret between the pair", () => {
		const state = make("Hello world", 5).update({
			changes: { from: 5, insert: "()" },
			selection: { anchor: 6 },
			userEvent: "input.type",
		}).state;
		expect(visible(state)).toBe("Hello{+()+} world");
		expect(state.doc.sliceString(state.selection.main.head - 1, state.selection.main.head + 1)).toBe("()");
	});

	test("editing mode leaves edits alone", () => {
		const state = typeChars(make("Hello world", 5, false), "!");
		expect(state.doc.toString()).toBe("Hello! world");
	});

	test("programmatic changes pass through", () => {
		const state = make("Hello world", 0).update({ changes: { from: 0, insert: "X" } }).state;
		expect(state.doc.toString()).toBe("XHello world");
	});

	test("composed text is not rewritten while composing", () => {
		const state = make("안녕 세상", 3).update({
			changes: { from: 3, insert: "하" },
			userEvent: "input.type.compose",
		}).state;
		expect(state.doc.toString()).toBe("안녕 하세상");
	});
});
