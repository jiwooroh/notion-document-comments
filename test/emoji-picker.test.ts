import { describe, expect, test } from "vitest";
import { emojiGroups, firstEmoji } from "../src/ui/emoji-picker";

describe("emoji picker", () => {
	test("lists a large, de-duplicated set of emoji in groups", () => {
		const groups = emojiGroups();
		const all = groups.flatMap((g) => g.emoji);
		expect(groups.length).toBeGreaterThanOrEqual(6);
		expect(all.length).toBeGreaterThan(800);
		expect(new Set(all).size).toBe(all.length);
		for (const e of ["😀", "🐶", "🍕", "⚽", "🚀", "📌", "⭐", "👀"]) expect(all).toContain(e);
		expect(all).toContain("❤️"); // text-style pictograph gets the emoji selector
	});

	test("picks the first whole emoji from typed or pasted text", () => {
		expect(firstEmoji(" 🎉 party")).toBe("🎉");
		expect(firstEmoji("👍🏽")).toBe("👍🏽");
		expect(firstEmoji("👩‍💻 coding")).toBe("👩‍💻");
		expect(firstEmoji("🇰🇷")).toBe("🇰🇷");
		expect(firstEmoji("❤️")).toBe("❤️");
		expect(firstEmoji("no emoji here")).toBeNull();
	});
});
