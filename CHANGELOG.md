# Changelog

All notable changes to **Document Comments**. The release workflow uses the section
matching the pushed tag as that GitHub release's notes, so add an entry here before tagging.

## Unreleased

## 0.2.19

- **Resolved comments in the status bar menu:** the comment-style menu in the status bar has a "Show resolved comments" checkbox, so you can show or hide resolved comments without opening settings.

![Comment style menu in the status bar](https://raw.githubusercontent.com/jiwooroh/notion-document-comments/main/docs/screenshots/status-menu-0.2.19.jpg)

- **Neutral focus colors:** focused comment boxes, the new-comment card and its text, selected colors and menu items, your own reactions, and the sidebar color filter use a neutral gray instead of the theme's accent color.

![Reply box with a neutral gray focus border](https://raw.githubusercontent.com/jiwooroh/notion-document-comments/main/docs/screenshots/neutral-focus-0.2.19.jpg)

- **Apple color scheme updated:** new text and highlight colors for red, yellow, green, blue, pink, gray, and brown (orange and purple unchanged). See the Apple table in the README for every value, including what each highlight looks like on a light or dark page.

- Editor list lines under a task item (`- [x]`, custom checkboxes) get a `dc-below-task-N` class with their depth below it, so a CSS snippet can restart bullet shapes under a checkbox in Live Preview too.

- New command **Find what makes the note wider than the screen**: outlines in red whatever sticks out past the note's right edge (the usual cause of a blank strip on the right, especially on phones) and names the widest few.

- **PDF export:** no more footnote numbers (each comment sits beside its highlight in the same color), comment text is bigger, and a comment is never split across a page break.

- Fixed checkbox icons (task lists and custom checkboxes, e.g. a bookmark or flame) being cut in half on the left while a long comment is folded to "more".

- Comment cards have slightly less space at the top (10px → 8px; iPad 7px → 6px).

- Settings: a note at the top says every option applies immediately, and that new options after a plugin update appear once you reload Obsidian (⌘R) or reopen Settings. Changing **Author** now re-applies your profile photo right away.

- **Comment style in the status bar:** the 💬 menu at the bottom of Obsidian now also switches the card color indicator (line, colored card, dot, nothing) and the highlight style (highlight, underline, both), not just the card view.

- **New settings:** **Indicator line thickness** (1–8 px) for the colored left edge, and **Colored card strength** (3–40%) for how strongly a Colored card is filled with its comment's color.

- **Line indicator:** the comment's color is now the card's own left edge (its border) instead of a separate bar inside the card.

- Fixed the color and style pickers (⋯ → Change color / Change style) sometimes opening in the window's top-left corner instead of under the card's ⋯ button.

- **Dot indicator:** the color dot lines up with the card's first line (the author row, or the comment text in Compact view) instead of sitting low beside the text like a period, and is slightly bigger.

- **Stronger hover:** hovering a highlight or its card darkens it more clearly than in 0.2.13–0.2.18 (still lighter than before 0.2.13).

- **iPad narrow panes:** when the pane is narrower than about 690px (Split View, Slide Over, a narrow split), the comment column is no longer reserved; cards hide and appear when you tap a highlight, like a narrow window on desktop.

## 0.2.18

- Addressed the Obsidian review warnings: dev-tool dependencies updated (no high or critical vulnerabilities left), `!important` removed from the stylesheet except where it must win over Obsidian's print styles or a note snippet's own `!important`, no `all: unset`, and the README credits the original author without linking a same-named repository.

## 0.2.17

- Builds with the standard TypeScript compiler (`tsc`) instead of a TypeScript 7 preview alias, so a fresh clone installs and builds with common tooling.

## 0.2.16

- **Passes Obsidian's plugin review checks:** no regex lookbehind (unsupported on older iOS), no direct `element.style` writes or `document` globals, and no deprecated slider API.

## 0.2.15

- **No Reply button:** cards no longer show a Reply button (and it's gone from the iPad ⋯ menu). Click a card to reply.

- Highlights on formatted text (inline HTML) now appear in the same frame as the text while you scroll or type, instead of about 150 ms later.

- Fixed a card's color indicator not changing when you change that comment's color.

- **Smoother scrolling:** in the editor, the comment column no longer re-measures every card and re-reads styles on each scroll frame — it already scrolls with the text. The narrow-window check is cached until the window or theme changes.

## 0.2.14

![PDF style card view](https://raw.githubusercontent.com/jiwooroh/notion-document-comments/main/docs/screenshots/pdf-style-0.2.14.jpg)

- **PDF style card view:** a third choice next to Default and Compact (status bar, or settings → Comment card view). Like a PDF reader, each comment is a small note icon in its color right next to the text, level with its highlight; hover shows the first line, and clicking the icon or the highlight opens the card beside it as a rounded card in the comment's color with a light shadow. Escape, a click elsewhere, or the icon again closes it. Opening and closing don't animate. Works in Live Preview and Reading view; the sidebar is unchanged.

- **Comments keep the interface font:** a note's own font (for example a serif cssclass or snippet) no longer changes the font of its comment cards or of comments in PDF exports.

- **Bold (and other formatting) at the start of a line now shows correctly** in Reading view and PDF when it has a comment. A line that starts with the comment marker isn't formatted by Markdown, so `**text**` showed its asterisks. New comments put the marker inside the formatting, and existing ones are fixed automatically when you open the note.
- **PDF export:** crowded comments no longer overlap — only the first comment of a crowded group moves up, and never into the comment above.

- **Faster again:** moving the mouse over highlighted text no longer makes the comment margin re-measure every card and repaint highlights each time the hover changes. The sidebar's color chips are rebuilt only when they change.

- **PDF export:** a comment near the bottom of a page now starts beside its text and continues on the next page, instead of the whole comment jumping to the next page.
- **PDF export:** comments on nearby lines no longer pile up below their text — the group moves up a little so it centers on its highlights, like the comment margin in Obsidian.

## 0.2.13

- **Compact card view:** a switch in the status bar at the bottom of Obsidian (also in settings and as the **Toggle compact comment cards** command) between **Default** and **Compact**. Compact cards show only the comment text; click a card to see its author, date, buttons, and reactions.
- `---` inside a comment is now a thin divider with normal spacing instead of a large gap.
- **PDF export:** comments now stay next to their text on every page. They were placed by position before the PDF was split into pages, so they drifted on later pages; they now flow with the text. Highlights inside blockquotes get their note at the start of the blockquote so it doesn't overlap the text.
- **Softer hover:** hovering a highlight or its card tints it only slightly darker.
- Fixed highlights not darkening on hover in the editing view (and for comments set to Underline or a per-comment style).
- **Much lighter on Obsidian overall:**
  - Reading view no longer refreshes comments every time Obsidian renders any Markdown (hover previews, embeds, canvas) or any file in the vault changes (sync tools do this constantly) — only for notes with comments that are open in Reading view, and it reads them from Obsidian's cache instead of from disk.
  - Table highlights stay idle unless the note has both comments and a table; before, they re-scanned the whole note on every keystroke, cursor move, and screen change in every note.
  - The comment margin and formatted-text highlights skip cursor-only changes, and card layout no longer re-measures styles on every scroll frame. Reading view lays out cards at most once per frame while scrolling.
- **Reaction picker:** quick reactions are now 👍 📌 ⭐️ 👀, and **+** opens every emoji (grouped by category) plus a box to type or paste any emoji, including flags, skin tones, and combined emoji.
- **Highlights show on formatted text in the editor:** when the commented text contains inline HTML — `<span class=…>`, `<mark>`, `<strong>`, `<u>`, and so on — Live Preview draws that HTML over the text, which hid the highlight. Those parts are now highlighted too, in the comment's color and style. Comments that lost a marker are highlighted in the editor as well.
- **Card color indicator:** each comment card shows the color of its highlight, in the margin and in the sidebar, so you can tell which card belongs to which text. Choose **Line on the left** (default), **Colored card**, **Dot**, or **Nothing** in settings (**Card color indicator**).
- **Sidebar color filter:** under Open / Resolved / All, pick one or more colors to see only those comments, or **All** to see every color. Each chip shows how many comments use that color.
- Fixed a narrow window or pane scrolling sideways — text cut off on the left with a blank strip on the right. The note title and properties kept their full width while the text column narrowed for the comment margin.

## 0.2.12

![Comment cards beside the note on iPad](https://raw.githubusercontent.com/jiwooroh/notion-document-comments/main/docs/screenshots/ipad-0.2.12.webp)

### iPad

- **Comments show beside the text.** When a note has comments, the text narrows so the comment column fits next to it, instead of cards floating over the text and hiding until you tap a highlight.
- **Compact cards:** a 270px comment column, tighter padding and spacing, smaller buttons, and slightly rounded corners. Cards sit evenly between the text and the screen edge.
- **Simpler buttons:** each comment shows just React and ⋯. Resolve/Reopen and Reply are in the ⋯ menu (you can also tap a card to reply).

### Reading view fixes

![Comment cards beside highlights in Reading view on Mac](https://raw.githubusercontent.com/jiwooroh/notion-document-comments/main/docs/screenshots/mac-0.2.12.jpg)

- **Comments no longer disappear in Reading view.** The plugin attached to the first Reading view element it found in the tab, which could be a hidden copy of the note (for example one rendered by another plugin), so highlights and cards went there out of sight. It now uses the note's own Reading view.
- **Commented text with formatting is found:** bold, italic, links and wikilinks, `==highlights==`, text that crosses a formatting boundary, and overlapping comments all get their highlight and card now (in Reading view and PDF export).
- **Text across blockquote or list lines** is found too.
- **Comments that lost a marker** (for example after an edit outside the plugin) show again, found by the quote saved with the comment.

### Everywhere

- **Editor: comments scroll exactly with the text.** The comment column now lives inside the note's own scroll area in the editing view, so cards no longer trail behind while scrolling.
- **No more flickering cards:** a long comment that just barely fit kept folding and unfolding; it now stays put.
- **Cards use your note's text font** in every view (Reading view and the sidebar used the interface font).

## 0.2.11

### Fixed

- **Deleting a comment no longer changes your note.** When the commented text was selected together with its line break (for example a triple-clicked line or a whole paragraph), deleting the comment also removed the blank line next to it, joining two paragraphs. Now only the comment's hidden markers are removed and the note is left exactly as it was.

### Colors

- **Apple scheme** updated (text color light / dark; highlights are the same colors at 15%):

| Color | Text: light | Text: dark | Highlight: light | Highlight: dark |
|---|---|---|---|---|
| Red | `#DE2E21` | `#EC5F55` | `#DE2E2126` | `#EC5F5526` |
| Green | `#30CF6A` | `#51DB84` | `#30CF6A26` | `#51DB8426` |
| Blue | `#3869F0` | `#598BF8` | `#3869F026` | `#598BF826` |
| Pink | `#ED358E` | `#F75FA8` | `#ED358E26` | `#F75FA826` |

  Red no longer has an orange tint, and pink now leans magenta so the two are easy to tell apart. Orange, yellow, purple, gray, and brown are unchanged.

- **Notion scheme pink** (light mode) highlight is now `#FDE8F1` (RGB 253, 232, 241), a clearer pink.

### Full color reference

All highlight and text colors in 0.2.11, for both color schemes. **Text** colors the underline, hover tint, and colored comment text. **Highlight** is the fill behind commented text (at 0% intensity). Apple's highlights are translucent: the last two digits are opacity (`26` = 15%, `33` = 20%). For text + background, use a color's text value on its own highlight, for example `#DE2E21` on `#DE2E2126`.

#### Notion

| Color | Text: light | Text: dark | Highlight: light | Highlight: dark |
|---|---|---|---|---|
| Red | `#C4554D` | `#CF5D57` | `#FAECEC` | `#4D302B` |
| Orange | `#CC782F` | `#BD8052` | `#F8ECDF` | `#573C27` |
| Yellow | `#C29343` | `#C29A56` | `#FAF3DE` | `#53442C` |
| Green | `#548164` | `#659C75` | `#EEF3EC` | `#2A3C31` |
| Blue | `#487CA5` | `#6786C4` | `#E9F3F7` | `#1E394C` |
| Purple | `#8A67AB` | `#956ACD` | `#F6F3F9` | `#3A2E47` |
| Pink | `#B35388` | `#C25F94` | `#FDE8F1` | `#492E3B` |
| Gray | `#787774` | `#9B9B9B` | `#F1F1EF` | `#2F2F2F` |
| Brown | `#976D57` | `#B28773` | `#F3EEEE` | `#46332A` |
| Default | theme text | theme text | theme highlight | theme highlight |

#### Apple

| Color | Text: light | Text: dark | Highlight: light | Highlight: dark |
|---|---|---|---|---|
| Red | `#DE2E21` | `#EC5F55` | `#DE2E2126` | `#EC5F5526` |
| Orange | `#F09343` | `#F09748` | `#F0934326` | `#F0974826` |
| Yellow | `#F4C242` | `#F6CE55` | `#F4C24233` | `#F6CE5526` |
| Green | `#30CF6A` | `#51DB84` | `#30CF6A26` | `#51DB8426` |
| Blue | `#3869F0` | `#598BF8` | `#3869F026` | `#598BF826` |
| Purple | `#BB3ED9` | `#CA43EA` | `#BB3ED926` | `#CA43EA26` |
| Pink | `#ED358E` | `#F75FA8` | `#ED358E26` | `#F75FA826` |
| Gray | `#9898A0` | `#A0A0A7` | `#9898A026` | `#A0A0A726` |
| Brown | `#B38C65` | `#B8946F` | `#B38C6526` | `#B8946F26` |
| Default | theme text | theme text | theme highlight | theme highlight |

## 0.2.10

### New: Color scheme setting

Choose the palette for the 9 highlight and text colors in **Settings → Notion-style Comments → Color scheme**:

- **Notion** (default): the existing soft palette with solid fills. Nothing changes unless you switch.
- **Apple** (new): bright Apple-style colors with translucent highlight fills, so the page shows through.

The scheme applies everywhere the 9 colors are used: comment highlights, underlines and hover color, the text and highlight colors in the comment formatting toolbar, and PDF export. Each scheme has its own light and dark palette.

### Apple palette

| Color | Text: light | Text: dark | Highlight: light | Highlight: dark |
|---|---|---|---|---|
| Red | `#ED5D4A` | `#EE6958` | `#ED5D4A26` | `#EE695826` |
| Orange | `#F09343` | `#F09748` | `#F0934326` | `#F0974826` |
| Yellow | `#F4C242` | `#F6CE55` | `#F4C24233` | `#F6CE5526` |
| Green | `#53C67D` | `#5EC986` | `#53C67D26` | `#5EC98626` |
| Blue | `#3B86F7` | `#3F8FF7` | `#3B86F726` | `#3F8FF726` |
| Purple | `#BB3ED9` | `#CA43EA` | `#BB3ED926` | `#CA43EA26` |
| Pink | `#EB445A` | `#EB4B63` | `#EB445A26` | `#EB4B6326` |
| Gray | `#9898A0` | `#A0A0A7` | `#9898A026` | `#A0A0A726` |
| Brown | `#B38C65` | `#B8946F` | `#B38C6526` | `#B8946F26` |

Text + highlight uses the text color on its matching highlight (e.g. light-mode red is `#ED5D4A` on `#ED5D4A26`). **Theme default** still uses your theme's own highlight with no extra color.

### Notes

- **Highlight intensity** works with both schemes: 0% shows the scheme's exact color, higher values make highlights bolder.
- **Custom highlight colors** pickers show the selected scheme's defaults (Apple's translucent fills are previewed as they look on a light or dark page). A custom color applies under both schemes.

## 0.2.9

- Removed the **Show floating button** setting and its selection button. Add comments with the **Add comment** command, or the **Comment** button in [Notion Selection Toolbar](https://github.com/jiwooroh/notion-selection-toolbar).

## 0.2.8

- **Profile photo:** pick an image from your vault (or paste an image link) in settings, and it shows small and round next to your name on your own comments and replies. Turn off **Show my profile** to hide your name and photo on your comments.
- **Long comments show in full** in the margin when there's room. A long comment folds to a "more" preview only when it would run into the next card (or is too tall for the window), or when you fold it yourself with the new **less** link. Your "more" / "less" choice stays until you click the other.

## 0.2.7

- **iPad:** comment cards now show in the right margin on tablets, like on desktop. Only phones skip the margin and use the sidebar and a pop-up for new comments.

## 0.2.6

- **Show author names** setting: turn it off to hide who wrote each comment and reply, on comment cards and in highlight hover previews. On by default.

## 0.2.5

- **Highlight colors** updated to Notion's current palette: background variants as the fill and bold text variants as the tone, in light and dark mode. **Highlight intensity** still mixes the tone into the fill (0% = Notion's exact color).

## 0.2.4

- **Custom highlight colors** settings now show each color's default for its own theme (Notion's light palette in the light rows, dark palette in the dark rows) instead of a blank swatch, and **Reset** updates the swatch right away.

## 0.2.3

- **Notion highlight colors:** the 9 highlight colors now use Notion's current palette in light and dark mode (background color as the fill, text color for underlines and colored comment text). Default **Highlight intensity** is now 0%, so highlights match Notion exactly; raise it for bolder colors.

## 0.2.2

- **Annotation style** now has three options: **Highlight** (fill only, no underline), **Underline** (no fill), and **Highlight + underline**. Highlights no longer get an underline unless you choose it, in the editor, Reading view, tables, and PDF export.
- **Comments in PDF export:** exported PDFs highlight each commented passage with a footnote number and print its comment beside it in a right-hand margin column. Toggle it with the new **Show comments in PDF export** setting or the **Toggle comments in PDF export** command.

## 0.2.1

- Renamed the plugin to **Notion-style Comments** (ID `notion-style-comments`) so it can be listed separately from the original Document Comments. The comment format in your notes is unchanged.

## 0.2.0

First release of Lucy's fork, based on the original plugin's 0.1.12 by Kyle McDonald.

- **Text formatting toolbar in comments:** select text in a comment box to apply bold, italic, underline, strikethrough, text color, or highlight.
- **Highlight colors:** theme default or 9 Notion-style colors, an intensity slider, and custom hex values per color for light and dark themes.
- **Annotation style:** mark commented text with a filled highlight or a quiet underline.
- **Per-comment overrides:** change a single comment's color or style from its **⋯** menu.
- **Show floating button** setting: a comment button next to selected text. Also works with [Notion Selection Toolbar](https://github.com/jiwooroh/notion-selection-toolbar)'s **Comment** button.
- **Narrow window layout:** when the margin doesn't fit, cards hide and appear on hover.
- Comment boxes grow as you type, long comments clamp with a "more" link, and clicking your own comment text edits it.

## 0.1.12

- Added an **Allow empty comments** setting. An empty comment highlights its selected text and shows an editable **Empty** card. Run **Add comment** on the same text to add text or delete the comment ([#52](https://github.com/kylemcd/obsidian-document-comments/issues/52)).

## 0.1.11
- **Comments on code blocks** — select one or more lines inside a fenced code block and comment on them. The lines are highlighted in Live Preview and Reading view, and a commented code block lays out exactly like an uncommented one, with no added gap above or below it.
- Fixed a forward-delete (the Del / Fn+Delete key) at the end of a commented line silently destroying the entire comment thread, with nothing appearing to change in the note.
- Fixed multi-line comment text — a reply written with line breaks — becoming corrupted on save, where it could re-parse into a broken entry and a phantom reaction. Line breaks, blank lines, and trailing spaces are now preserved.
- Fixed commenting on text (or signing with an author name) containing `-->`, which could break the stored comment and leak the discussion as visible text in Reading view, on GitHub, and in exports.
- Deleting a comment now removes every copy of its markers, so copy-pasting commented text no longer leaves behind invisible markers that couldn't be removed.
- Comment edits and replies made from the sidebar or Reading view now go through the open editor when the note is open, so they join its undo history and no longer risk clobbering unsaved changes.
- Orphaned comments — a discussion whose highlighted text is no longer present — no longer appear as empty cards in the margin; they remain available in the **All discussions** sidebar ([#43](https://github.com/kylemcd/obsidian-document-comments/issues/43)).

## 0.1.10
- Removed the `text-decoration-color` declarations that Obsidian's community-plugin review groups under the partially supported `text-decoration` browser feature. Open and resolved table comments remain visually distinct through their highlight backgrounds.

## 0.1.9
- Fixed an Obsidian community-plugin review compatibility warning by replacing the extended `text-decoration` shorthand in Live Preview table highlights with supported underline and color declarations. Table comment highlights remain visible in both open and resolved states.

## 0.1.8
- Fixed Live Preview table comments remaining unhighlighted until their cell was focused. Highlights now match Markdown-formatted anchors such as inline code and map mounted table widgets by source position, so they remain correct when CodeMirror virtualizes earlier tables.
- Kept hidden comment markers from appearing or wrapping text in focused table cells while preserving reliable cursor movement across marker boundaries.
- Fixed comments on inline code selections such as `` `Spinner` `` by placing the invisible anchor markers outside the backticks instead of rendering them as literal code.

## 0.1.7
- Added comment highlights inside Live Preview tables and hover previews for highlighted text. Highlights remain passive when clicked; selecting a comment in the sidebar now scrolls to its text reliably in either direction ([#29](https://github.com/kylemcd/obsidian-document-comments/issues/29)).
- Unified comment creation around the reliable **Add comment** selection command across regular text and tables, while retaining a separate Reading view command.
- Fixed the comment composer appearing behind table rows and other stacking problems in tables ([#28](https://github.com/kylemcd/obsidian-document-comments/issues/28)).
- Fixed cursor pauses and caret-height jumps around inline comment markers, including adjacent punctuation, line boundaries, nested markers, and deletion cases ([#41](https://github.com/kylemcd/obsidian-document-comments/issues/41)).
- Addressed Obsidian community-plugin review warnings by using supported DOM helpers and settings indexing patterns.
- Updated the release toolchain and development dependencies, including TypeScript 7, Vitest 4, typescript-eslint, eslint-plugin-obsidianmd, `@types/node`, and `actions/setup-node`; refreshed transitive dependencies with zero known audit vulnerabilities.

## 0.1.6
- Fixed the inline comment column continuing to reserve its ~320px of margin over empty space once every comment on a note was resolved (with "Show resolved" off). The column is now reserved only when a comment's card actually renders, in both Live Preview and Reading view ([#30](https://github.com/kylemcd/obsidian-document-comments/issues/30)).
- Updated development dependencies (oxlint, eslint, typescript-eslint, @types/node, @codemirror/view).

## 0.1.5
- Fixed the document reflowing (shifting left, then re-centering) every time you started or finished a comment. The new-comment composer is a floating overlay and no longer reserves the margin column, so the text stays put — most noticeable when the comments sidebar is open and the inline column isn't shown ([#15](https://github.com/kylemcd/obsidian-document-comments/issues/15)).

## 0.1.4
- **Mobile support** — Document Comments now works on Obsidian mobile. There's no floating margin on phones and tablets; instead the in-text highlights mark commented text and you read, reply, and resolve through the **"All discussions" sidebar**, with new comments composed in a quick dialog. It's the same inline storage, so a note's comments are identical across desktop and mobile.
- Saving a comment now reports a clear reason if it ever fails, instead of occasionally failing silently.

## 0.1.3
- Sidebar: the last comment's reply field is no longer cut off at the bottom — there's room to scroll it up clear of the status bar, with space to grow as you type.

## 0.1.2
- **Markdown in comments** — comment text now renders Markdown (code spans, bold, links, lists) in both the margin and the sidebar.
- **Long comments** collapse to a "Show more" preview; one click opens the full thread *and* the reply box. A thread taller than the screen shows "Open in sidebar" instead (its bottom is unreachable inline).
- **Margin polish** — cards slide off the top edge as you scroll instead of sticking; clicking a card no longer scrolls the document; the reply box reveals and focuses when you open a card; expand/collapse animates smoothly.
- Comment highlights now render inside **tables** in Reading view. (Live Preview can't highlight inside its table widget — a documented limitation.)

## 0.1.1
- Addressed Obsidian community-plugin review feedback.
- Removed every `:has()` and `!important` from the stylesheet (selectors are now scoped to out-specify Obsidian's core rules).
- Replaced the `builtin-modules` build dependency with `node:module`.
- Added a CI release workflow that builds the plugin and attaches **build-provenance attestations** to the release assets.

## 0.1.0
- Initial release — Notion/Linear-style margin comments stored inline in your markdown as HTML comments, with threads, reactions, resolve/reopen, a comments sidebar, and Reading-view support.
