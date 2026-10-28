import { describe, expect, test } from "vitest";
import { Text } from "@codemirror/state";
import { levelBelowTask } from "../src/editor/list-bullets";

const doc = (s: string) => Text.of(s.split("\n"));

describe("list levels below a task item", () => {
	const d = doc(
		[
			"- [?] What class is Holmes?",
			"\t- works, lives in an apartment",
			"\t- unless you are a doctor",
			"\t  continued line",
			"\t\t- mixed feelings",
			"\t\t\t- at the same time",
			"- plain item",
			"\t- child of plain",
		].join("\n"),
	);
	test("children of a task count from 1", () => {
		expect(levelBelowTask(d, 2, 4)).toBe(1);
		expect(levelBelowTask(d, 3, 4)).toBe(1);
		expect(levelBelowTask(d, 5, 4)).toBe(2);
		expect(levelBelowTask(d, 6, 4)).toBe(3);
	});
	test("items without a task parent are left alone", () => {
		expect(levelBelowTask(d, 1, 4)).toBe(0);
		expect(levelBelowTask(d, 7, 4)).toBe(0);
		expect(levelBelowTask(d, 8, 4)).toBe(0);
	});
	test("a paragraph ends the list", () => {
		const p = doc(["- [x] task", "", "Paragraph", "\t- not a child"].join("\n"));
		expect(levelBelowTask(p, 4, 4)).toBe(0);
	});
});
