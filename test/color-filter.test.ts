import { describe, expect, it } from "vitest";
import { colorKey, colorLabel, colorsPresent, filterByColors } from "../src/ui/color-filter";

const c = (color?: string) => ({ color });

describe("sidebar color filter", () => {
	it("treats an uncolored comment as 'default'", () => {
		expect(colorKey(c())).toBe("default");
		expect(colorKey(c("red"))).toBe("red");
		expect(colorLabel("default")).toBe("No color");
		expect(colorLabel("red")).toBe("Red");
	});

	it("shows everything when nothing is selected", () => {
		const list = [c("red"), c(), c("blue")];
		expect(filterByColors(list, new Set())).toEqual(list);
	});

	it("keeps only the selected colors", () => {
		const list = [c("red"), c(), c("blue"), c("red")];
		expect(filterByColors(list, new Set(["red"]))).toEqual([c("red"), c("red")]);
		expect(filterByColors(list, new Set(["red", "default"]))).toEqual([c("red"), c(), c("red")]);
	});

	it("lists the colors used, in palette order, with counts", () => {
		expect(colorsPresent([c("red"), c("yellow"), c(), c("red")])).toEqual([
			{ key: "default", count: 1 },
			{ key: "yellow", count: 1 },
			{ key: "red", count: 2 },
		]);
	});
});

import { cardSignature } from "../src/ui/card-format";

describe("card refresh", () => {
	it("a color change re-renders the card, so its indicator follows", () => {
		const base = {
			id: "a",
			open: null,
			close: null,
			body: null,
			status: "open" as const,
			thread: [],
			reactions: [],
		};
		expect(cardSignature({ ...base, color: "red" })).not.toBe(cardSignature({ ...base }));
		expect(cardSignature({ ...base, style: "underline" })).not.toBe(cardSignature({ ...base }));
	});
});
