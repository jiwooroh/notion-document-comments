import { describe, expect, test } from "vitest";
import { PIN_GAP, PIN_SIZE, clampPopover, pinTops, previewText } from "../src/ui/pdf-pins";

describe("PDF style note icons", () => {
	test("center each icon on its highlight", () => {
		expect(pinTops([100, 300])).toEqual([100 - PIN_SIZE / 2, 300 - PIN_SIZE / 2]);
	});

	test("stack icons on nearby lines with a small offset", () => {
		const tops = pinTops([100, 102, 104]);
		expect(tops[1]).toBe((tops[0] ?? 0) + PIN_SIZE + PIN_GAP);
		expect(tops[2]).toBe((tops[1] ?? 0) + PIN_SIZE + PIN_GAP);
	});

	test("keep an open popover inside the visible area", () => {
		expect(clampPopover(100, 50, 0, 500)).toBe(100);
		expect(clampPopover(480, 50, 0, 500)).toBe(442);
		expect(clampPopover(-40, 50, 0, 500)).toBe(8);
		// Taller than the view: pinned to the top rather than cut off there.
		expect(clampPopover(100, 800, 0, 500)).toBe(8);
	});

	test("tooltip is the first line of the comment, without Markdown", () => {
		expect(previewText({ thread: [{ author: "a", text: "**Tension**\\ndiving = down" }] })).toBe("Tension");
		expect(previewText({ thread: [{ author: "a", text: "\n- see [[Note|this note]] and [a link](x)" }] })).toBe(
			"see this note and a link",
		);
		expect(previewText({ thread: [] })).toBe("");
	});
});
