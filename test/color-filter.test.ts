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
