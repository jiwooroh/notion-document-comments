import {
	Component,
	Editor,
	MarkdownRenderer,
	MarkdownView,
	Menu,
	Notice,
	Platform,
	Plugin,
	TFile,
	WorkspaceLeaf,
	debounce,
	setIcon,
} from "obsidian";
import { Result } from "better-result";
import { EditorView } from "@codemirror/view";
import { commentField } from "./editor/state";
import { marginPlugin } from "./editor/margin";
import { commentConfig } from "./editor/config";
import { editorLayoutField } from "./editor/layout";
import { draftField, setDraft } from "./editor/draft";
import { addComment, insertCommentInFile, resolveAllSuggestions } from "./editor/commands";
import { suggestExtension } from "./editor/suggest";
import { findHighlightAtSelection } from "./editor/edits";
import { findSectionRange, highlightPostProcessor, mapReadingSelection } from "./reading/highlight";
import { ReadingDeps, ReadingMarginManager } from "./reading/margin";
import { printNotesPostProcessor } from "./reading/print-notes";
import { setPreviewShowsAuthor } from "./format/preview";
import { applyProfile, clearProfile } from "./ui/profile";
import { COMMENTS_VIEW_TYPE, CommentsSidebarView, SidebarDeps } from "./ui/sidebar";
import { CommentModal } from "./ui/comment-modal";
import { DEFAULT_SETTINGS, DocCommentsSettings, DocCommentsSettingTab } from "./settings";
import { tableHighlightPlugin } from "./editor/table-highlights";
import { htmlHighlightPlugin } from "./editor/html-highlights";
import { activeAnchorField } from "./editor/active";
import { computeLineStartMarkupFixes } from "./format/line-start";
import { applyCommentEdit } from "./editor/routing";
import { resetNarrowCache } from "./util/narrow";
import {
	applyAnnotationStyle,
	applyColorScheme,
	applyCustomHighlightColors,
	applyHighlightColor,
	applyHighlightIntensity,
} from "./ui/highlight-colors";
import { TextFormatToolbar } from "./ui/text-toolbar";

export default class DocCommentsPlugin extends Plugin {
	settings: DocCommentsSettings = { ...DEFAULT_SETTINGS };
	private markdown = new Component();
	private ribbonIcon: HTMLElement | null = null;
	private readingManager: ReadingMarginManager | null = null;
	private scheduleReadingRefresh: () => void = () => {};
	/** True while the "All discussions" sidebar panel is mounted. */
	private sidebarOpen = false;
	private textToolbar: TextFormatToolbar | null = null;
	private cardViewStatus: HTMLElement | null = null;
	private editModeStatus: HTMLElement | null = null;
	private editModeRibbon: HTMLElement | null = null;
	/** The Editing / Suggesting button in each open note's header. */
	private editModeActions = new Map<MarkdownView, HTMLElement>();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addChild(this.markdown);
		applyHighlightColor(this.settings.highlightColor);
		applyHighlightIntensity(this.settings.highlightIntensity);
		applyCustomHighlightColors(this.settings.highlightColorsLight, this.settings.highlightColorsDark);
		applyAnnotationStyle(this.settings.annotationStyle);
		applyColorScheme(this.settings.colorScheme);
		this.applyAuthorVisibility();
		this.applyCardView();
		// Vault images resolve only once the vault is indexed.
		this.app.workspace.onLayoutReady(() => this.applyProfile());

		this.registerEditorExtension([
			commentField,
			tableHighlightPlugin,
			htmlHighlightPlugin,
			activeAnchorField,
			draftField,
			suggestExtension,
			commentConfig.of({
				app: this.app,
				renderMarkdown: (markdown, el) =>
					MarkdownRenderer.render(
						this.app,
						markdown,
						el,
						this.app.workspace.getActiveFile()?.path ?? "",
						this.markdown,
					),
				author: () => this.authorName(),
				showComments: () => this.settings.showComments,
				showResolved: () => this.settings.showResolved,
				allowEmptyComments: () => this.settings.allowEmptyComments,
				sidebarOpen: () => this.sidebarOpen,
				openInSidebar: (id) => void this.revealComment(id),
				isMobile: () => Platform.isPhone,
				suggesting: () => this.settings.editMode === "suggest",
			}),
			// Reflects dc-has / dc-highlights / dc-hide-resolved onto .cm-editor so the
			// stylesheet caps the text column without a :has() selector.
			editorLayoutField,
			// The floating margin column needs horizontal room a phone doesn't have, so
			// there we skip it entirely — comments live in the sidebar, highlights stay,
			// and new comments are composed in a modal (see startAddComment). Tablets
			// (iPad) have the room, so they get the margin like desktop.
			...(Platform.isPhone ? [] : [marginPlugin]),
		]);

		// Reading view: a separate render path. Highlights come from a post-processor;
		// the margin column is managed per reading-view container.
		const readingDeps: ReadingDeps = {
			app: this.app,
			getAuthor: () => this.authorName(),
			showComments: () => this.settings.showComments,
			showResolved: () => this.settings.showResolved,
			allowEmptyComments: () => this.settings.allowEmptyComments,
			sidebarOpen: () => this.sidebarOpen,
			openInSidebar: (id) => void this.revealComment(id),
			isMobile: () => Platform.isPhone,
		};
		this.readingManager = new ReadingMarginManager(readingDeps);
		this.scheduleReadingRefresh = debounce(() => this.readingManager?.refresh(), 50, true);

		// The "All discussions" sidebar panel (Notion-style). While it's open the
		// inline floating cards step aside; the in-text highlights stay.
		const sidebarDeps: SidebarDeps = {
			app: this.app,
			getAuthor: () => this.authorName(),
		};
		this.registerView(COMMENTS_VIEW_TYPE, (leaf) => new CommentsSidebarView(leaf, sidebarDeps));

		this.registerMarkdownPostProcessor((el, ctx) => {
			highlightPostProcessor(el, ctx);
			// Obsidian renders Markdown everywhere (hover previews, embeds, canvas…);
			// only a section of a note that has comments needs the margin refreshed.
			if (ctx.getSectionInfo(el)?.text.includes("<!--c")) this.scheduleReadingRefresh();
			// PDF export awaits this before printing; it's a no-op everywhere else.
			return printNotesPostProcessor(el, ctx, {
				app: this.app,
				component: this.markdown,
				printComments: () => this.settings.printComments,
				showResolved: () => this.settings.showResolved,
				lightColors: () => this.settings.highlightColorsLight,
			});
		});
		// layout-change / active-leaf-change fire for every way the panel shows or
		// hides — open, close, collapse the dock, switch tabs — so the inline column
		// follows the panel's real visibility instead of a mount flag that misses
		// collapse/tab-switch.
		this.registerEvent(
			this.app.workspace.on("layout-change", () => {
				this.syncSidebarOpen();
				this.scheduleReadingRefresh();
			}),
		);
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.syncSidebarOpen();
				this.scheduleReadingRefresh();
			}),
		);
		// resize fires while a dock collapses/expands — catches that case promptly
		// even if layout-change doesn't.
		this.registerEvent(this.app.workspace.on("resize", () => this.syncSidebarOpen()));
		// Only a change to a note open in Reading view matters to the margin (sync
		// tools modify files all the time).
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				const shown = this.app.workspace
					.getLeavesOfType("markdown")
					.some(
						(leaf) =>
							leaf.view instanceof MarkdownView &&
							leaf.view.file === file &&
							leaf.view.getMode() === "preview",
					);
				if (shown) this.scheduleReadingRefresh();
			}),
		);
		// Comments made before 0.2.14 could start a line with their marker, which
		// stops Markdown from formatting that line (literal `**` in Reading view
		// and PDF). Move those markers inside the markup when the note is opened.
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file?.extension === "md") void this.fixLineStartMarkers(file);
			}),
		);
		// Fires on theme/appearance changes (light↔dark, snippet toggles, …) — a
		// custom per-color override is picked per-theme, so switching needs a
		// re-apply to pick up the other theme's map.
		this.registerEvent(
			this.app.workspace.on("css-change", () => {
				resetNarrowCache();
				this.refreshHighlightColor();
			}),
		);

		this.addCommand({
			id: "add-comment",
			name: "Add comment",
			editorCallback: (editor) => this.startAddComment(editor),
		});

		this.addCommand({
			id: "toggle-comments",
			name: "Toggle comments",
			callback: () => void this.toggleComments(),
		});

		this.addCommand({
			id: "toggle-resolved",
			name: "Toggle resolved comments",
			callback: () => void this.toggleResolved(),
		});

		this.addCommand({
			id: "toggle-compact-cards",
			name: "Toggle compact comment cards",
			callback: () => void this.setCardView(this.settings.cardView === "compact" ? "default" : "compact"),
		});

		// Status bar (desktop): the current card view, click to switch.
		this.cardViewStatus = this.addStatusBarItem();
		this.cardViewStatus.addClass("mod-clickable", "dc-card-view-status");
		this.cardViewStatus.setAttribute("aria-label", "Comment card view");
		this.registerDomEvent(this.cardViewStatus, "click", (evt) => {
			const menu = new Menu();
			for (const [id, label] of [
				["default", "Default view"],
				["compact", "Compact (comment text only)"],
				["pdf", "PDF style (note icons)"],
			] as const) {
				menu.addItem((item) =>
					item
						.setTitle(label)
						.setChecked(this.settings.cardView === id)
						.onClick(() => void this.setCardView(id)),
				);
			}
			menu.showAtMouseEvent(evt);
		});
		this.applyCardView();

		// Status bar: Editing / Suggesting, click to switch (Notion's mode menu).
		this.editModeStatus = this.addStatusBarItem();
		this.editModeStatus.addClass("mod-clickable", "dc-edit-mode-status");
		this.editModeStatus.setAttribute("aria-label", "Editing mode");
		this.registerDomEvent(this.editModeStatus, "click", (evt) => {
			const menu = new Menu();
			for (const [id, label] of [
				["edit", "Editing (change the text directly)"],
				["suggest", "Suggesting (edits become suggestions)"],
			] as const) {
				menu.addItem((item) =>
					item
						.setTitle(label)
						.setChecked(this.settings.editMode === id)
						.onClick(() => void this.setEditMode(id)),
				);
			}
			menu.showAtMouseEvent(evt);
		});
		this.applyEditMode();

		this.addCommand({
			id: "toggle-suggesting",
			name: "Toggle suggesting mode",
			callback: () => void this.toggleEditMode(),
		});

		this.addCommand({
			id: "accept-all-suggestions",
			name: "Accept all suggestions in this note",
			editorCallback: (editor) => this.resolveAllSuggestions(editor, true),
		});

		this.addCommand({
			id: "reject-all-suggestions",
			name: "Reject all suggestions in this note",
			editorCallback: (editor) => this.resolveAllSuggestions(editor, false),
		});

		this.addCommand({
			id: "toggle-print-comments",
			name: "Toggle comments in PDF export",
			callback: () => void this.togglePrintComments(),
		});

		this.addCommand({
			id: "add-comment-reading",
			name: "Add comment in reading view",
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view || view.getMode() !== "preview") return false;
				if (!checking) this.startAddCommentReading(view);
				return true;
			},
		});

		this.addCommand({
			id: "open-comments-sidebar",
			name: "Open comments sidebar",
			callback: () => void this.activateSidebar(),
		});

		this.ribbonIcon = this.addRibbonIcon(
			"message-square",
			"Toggle document comments",
			() => void this.toggleComments(),
		);
		this.updateRibbon();
		this.addRibbonIcon("messages-square", "Open comments sidebar", () => void this.activateSidebar());
		// The status bar doesn't exist on iPad and phones, so the mode switch is
		// also in the ribbon and in each note's header (where Notion puts it).
		this.editModeRibbon = this.addRibbonIcon("pencil", "Switch to suggesting", () => void this.toggleEditMode());
		this.app.workspace.onLayoutReady(() => this.addEditModeActions());
		this.registerEvent(this.app.workspace.on("layout-change", () => this.addEditModeActions()));
		this.applyEditMode();

		this.addSettingTab(new DocCommentsSettingTab(this.app, this));
		this.textToolbar = new TextFormatToolbar();
	}

	public startAddComment(editor: Editor): void {
		const view = editorView(editor);
		if (!view) {
			new Notice("Couldn't access the editor.");
			return;
		}
		const { from, to, empty } = view.state.selection.main;
		if (empty) {
			new Notice("Select some text to comment on.");
			return;
		}
		const doc = view.state.doc.toString();
		const targetHighlightId = findHighlightAtSelection(doc, from, to)?.id;
		if (Platform.isPhone) {
			// No floating margin composer on mobile — collect the text in a modal,
			// then write through the same editor path so it's a single undo step.
			const quote = view.state.doc.sliceString(from, to);
			const emptyAction = targetHighlightId ? "remove" : this.settings.allowEmptyComments ? "highlight" : "none";
			new CommentModal(
				this.app,
				quote,
				(text) => {
					// Pass the captured selection so a doc that shifted while the modal was
					// open (sync, another pane) is caught instead of mis-anchoring.
					const result = addComment(
						view,
						from,
						to,
						text,
						this.authorName(),
						quote,
						this.settings.allowEmptyComments,
						targetHighlightId,
					);
					if (result.isErr()) new Notice(`Couldn't add the comment: ${result.error}`);
					return result.map(() => undefined);
				},
				emptyAction,
			).open();
			return;
		}
		// Show a draft composer card in the margin (Notion-style) instead of a modal.
		view.dispatch({ effects: setDraft.of({ from, to, targetHighlightId }) });
	}

	/** Reading view has no editor surface, so map the rendered selection back to
	 *  source offsets (best-effort) and prompt for the comment text. */
	public startAddCommentReading(view: MarkdownView): void {
		const selection = activeWindow.getSelection();
		const selected = selection?.toString() ?? "";
		if (!selection || selection.rangeCount === 0 || !selected.trim()) {
			new Notice("Select some text to comment on.");
			return;
		}
		const section = selection.anchorNode ? findSectionRange(selection.anchorNode) : null;
		if (!section) {
			new Notice("Couldn't locate that selection in the note.");
			return;
		}
		// The selection may sit inside an embed or a hover preview — a different
		// file's rendered block. Its offsets are meaningless in the host file, so
		// refuse rather than write markers into the host at the wrong place.
		if (section.sourcePath !== view.file?.path) {
			new Notice("Can only comment on this note's own text, not embedded content.");
			return;
		}
		const data = view.getViewData();
		const sourceSelection = mapReadingSelection(selection, section, data);
		if (!sourceSelection) {
			new Notice("Couldn't map the selection to the Markdown — try plain text without formatting.");
			return;
		}
		const { from, to, expected } = sourceSelection;
		const targetHighlightId = findHighlightAtSelection(data, from, to)?.id;
		const emptyAction = targetHighlightId ? "remove" : this.settings.allowEmptyComments ? "highlight" : "none";
		if (Platform.isPhone) {
			// No margin composer on mobile — write straight to the file from a modal,
			// then refresh so the new highlight appears in the reading view.
			const file = view.file;
			if (!file) {
				new Notice("No file is open.");
				return;
			}
			new CommentModal(
				this.app,
				selected,
				(text) => this.insertReadingComment(file, from, to, text, expected, targetHighlightId),
				emptyAction,
			).open();
			return;
		}
		// Same inline draft composer as the editor (no modal).
		this.readingManager?.startDraft(
			view,
			from,
			to,
			selection.getRangeAt(0),
			expected,
			emptyAction,
			targetHighlightId,
		);
	}

	/** Mobile reading-view create: write to the file (no editor surface) and refresh.
	 *  insertCommentInFile already folds I/O + compute failures into the Result. */
	private async insertReadingComment(
		file: TFile,
		from: number,
		to: number,
		text: string,
		expected: string,
		targetHighlightId?: string,
	): Promise<Result<void, string>> {
		const result = await insertCommentInFile(
			this.app,
			file,
			from,
			to,
			text,
			this.authorName(),
			expected,
			this.settings.allowEmptyComments,
			targetHighlightId,
		);
		result.match({
			ok: () => this.scheduleReadingRefresh(),
			err: (message) => new Notice(`Couldn't add the comment: ${message}`),
		});
		return result.map(() => undefined);
	}

	private async toggleComments(): Promise<void> {
		this.settings.showComments = !this.settings.showComments;
		await this.saveSettings();
		this.updateRibbon();
		this.refreshEditors();
		new Notice(this.settings.showComments ? "Comments shown" : "Comments hidden");
	}

	private async toggleResolved(): Promise<void> {
		this.settings.showResolved = !this.settings.showResolved;
		await this.saveSettings();
		this.refreshEditors();
		new Notice(this.settings.showResolved ? "Resolved comments shown" : "Resolved comments hidden");
	}

	private async togglePrintComments(): Promise<void> {
		this.settings.printComments = !this.settings.printComments;
		await this.saveSettings();
		new Notice(this.settings.printComments ? "Comments included in PDF export" : "Comments left out of PDF export");
	}

	/** Hide or show author names: a body class for the cards (see styles.css)
	 *  and a flag for hover previews, which open Reading views re-render to
	 *  pick up (editors rebuild theirs on the next edit). */
	applyAuthorVisibility(): void {
		activeDocument.body.toggleClass("dc-hide-author", !this.settings.showAuthor);
		setPreviewShowsAuthor(this.settings.showAuthor);
		this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
			if (leaf.view instanceof MarkdownView && leaf.view.getMode() === "preview")
				leaf.view.previewMode.rerender(true);
		});
	}

	/** Your photo and the "Show my profile" switch, painted onto your own
	 *  comment entries via body-level CSS (see ui/profile.ts). */
	applyProfile(): void {
		applyProfile(this.app, this.settings.profilePhoto, this.settings.showMyProfile);
	}

	private async setCardView(view: string): Promise<void> {
		this.settings.cardView = view;
		await this.saveSettings();
		this.applyCardView();
	}

	async setEditMode(mode: string): Promise<void> {
		this.settings.editMode = mode;
		await this.saveSettings();
		this.applyEditMode();
		new Notice(mode === "suggest" ? "Suggesting: your edits become suggestions" : "Editing");
	}

	private toggleEditMode(): Promise<void> {
		return this.setEditMode(this.settings.editMode === "suggest" ? "edit" : "suggest");
	}

	/** Status bar label, ribbon and note-header buttons, and a body class. */
	applyEditMode(): void {
		const suggesting = this.settings.editMode === "suggest";
		activeDocument.body.toggleClass("dc-suggesting", suggesting);
		this.editModeStatus?.setText(suggesting ? "💡 Suggesting" : "✏️ Editing");
		this.editModeStatus?.toggleClass("is-suggesting", suggesting);
		const buttons = [this.editModeRibbon, ...this.editModeActions.values()];
		for (const el of buttons) {
			if (!el) continue;
			setIcon(el, suggesting ? "lightbulb" : "pencil");
			el.setAttribute(
				"aria-label",
				suggesting ? "Suggesting — switch to editing" : "Editing — switch to suggesting",
			);
			el.toggleClass("is-active", suggesting);
			el.addClass("dc-edit-mode-button");
		}
	}

	/** Add the mode button to notes opened since the last layout change, and
	 *  forget notes that were closed. */
	private addEditModeActions(): void {
		for (const view of Array.from(this.editModeActions.keys())) {
			if (!view.containerEl.isConnected) this.editModeActions.delete(view);
		}
		let added = false;
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView) || this.editModeActions.has(view)) continue;
			const el = view.addAction("pencil", "Editing — switch to suggesting", () => void this.toggleEditMode());
			this.editModeActions.set(view, el);
			added = true;
		}
		if (added) this.applyEditMode();
	}

	private resolveAllSuggestions(editor: Editor, accept: boolean): void {
		const view = editorView(editor);
		if (!view) {
			new Notice("Couldn't access the editor.");
			return;
		}
		resolveAllSuggestions(view, accept).match({
			ok: (count) =>
				new Notice(`${accept ? "Accepted" : "Rejected"} ${count} suggestion${count === 1 ? "" : "s"}`),
			err: (message) => new Notice(message),
		});
	}

	/** Compact cards: a body class the stylesheet keys off (no re-render). */
	/** See insideLineStartMarkup (format/line-start.ts). Only writes when needed. */
	private async fixLineStartMarkers(file: TFile): Promise<void> {
		const text = await this.app.vault.cachedRead(file);
		if (!text.includes("<!--c:") || computeLineStartMarkupFixes(text).length === 0) return;
		await applyCommentEdit(this.app, file, (doc) => Result.ok(computeLineStartMarkupFixes(doc)));
	}

	applyCardView(): void {
		const view = this.settings.cardView;
		const compact = view === "compact";
		activeDocument.body.toggleClass("dc-compact-cards", compact);
		activeDocument.body.toggleClass("dc-pdf-cards", view === "pdf");
		const indicator = this.settings.cardIndicator;
		for (const mode of ["line", "tint", "dot", "none"])
			activeDocument.body.toggleClass(`dc-indicator-${mode}`, mode === indicator);
		this.cardViewStatus?.setText(compact ? "💬 Compact" : view === "pdf" ? "💬 PDF style" : "💬 Default");
		// Cards are laid out differently per view; re-run layout everywhere.
		this.refreshEditors();
	}

	/** Re-applies the chosen palette color, the intensity slider, any custom
	 *  per-color overrides, and the highlight/underline annotation style.
	 *  Called by the settings tab after any of those change, and on theme
	 *  switches (custom overrides are picked per-theme). */
	refreshHighlightColor(): void {
		applyHighlightColor(this.settings.highlightColor);
		applyHighlightIntensity(this.settings.highlightIntensity);
		applyCustomHighlightColors(this.settings.highlightColorsLight, this.settings.highlightColorsDark);
		applyColorScheme(this.settings.colorScheme);
		applyAnnotationStyle(this.settings.annotationStyle);
	}

	updateRibbon(): void {
		if (!this.ribbonIcon) return;
		this.ribbonIcon.toggleClass("is-active", this.settings.showComments);
		this.ribbonIcon.setAttribute(
			"aria-label",
			this.settings.showComments ? "Hide document comments" : "Show document comments",
		);
	}

	/** Force open editors + reading views (+ the sidebar) to re-evaluate live config. */
	refreshEditors(): void {
		this.app.workspace.getLeavesOfType("markdown").forEach((leaf: WorkspaceLeaf) => {
			editorViewFromLeaf(leaf)?.dispatch({});
		});
		this.scheduleReadingRefresh();
		this.sidebarView()?.requestRefresh();
	}

	/** Reveal the comments sidebar panel, creating it in the right split if needed. */
	private async activateSidebar(): Promise<void> {
		const { workspace } = this.app;
		const opened = await Result.tryPromise({
			try: async () => {
				let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(COMMENTS_VIEW_TYPE)[0] ?? null;
				if (!leaf) {
					leaf = workspace.getRightLeaf(false);
					if (!leaf) return;
					await leaf.setViewState({ type: COMMENTS_VIEW_TYPE, active: true });
				}
				// A sidebar leaf restored from the workspace but never revealed is a
				// DeferredView (Obsidian ≥1.7) — its view isn't a CommentsSidebarView yet,
				// so revealComment/refresh would silently no-op. Force it to load first.
				if (leaf.isDeferred) await leaf.loadIfDeferred();
				await workspace.revealLeaf(leaf);
				this.syncSidebarOpen();
			},
			catch: (e) => (e instanceof Error ? e.message : "unknown error"),
		});
		if (opened.isErr()) new Notice(`Couldn't open the comments sidebar: ${opened.error}`);
	}

	/** Open the sidebar and scroll it to a thread — the escape from a margin card too
	 *  tall to fit the column even when expanded. */
	private async revealComment(id: string): Promise<void> {
		await this.activateSidebar();
		await this.sidebarView()?.revealComment(id);
	}

	/** The live sidebar view instance, if the panel is open. */
	private sidebarView(): CommentsSidebarView | null {
		const leaf = this.app.workspace.getLeavesOfType(COMMENTS_VIEW_TYPE)[0];
		return leaf?.view instanceof CommentsSidebarView ? leaf.view : null;
	}

	/** Recompute whether the comments panel is actually visible and, when that
	 *  changes, refresh editors so the inline column steps aside / comes back.
	 *  Visibility — not mere existence — is what matters: a collapsed dock or a
	 *  hidden tab must bring the inline cards back. */
	private syncSidebarOpen(): void {
		const open = this.isSidebarVisible();
		if (open === this.sidebarOpen) return;
		this.sidebarOpen = open;
		this.refreshEditors();
	}

	private isSidebarVisible(): boolean {
		const { workspace } = this.app;
		return workspace.getLeavesOfType(COMMENTS_VIEW_TYPE).some((leaf) => {
			// A collapsed dock flips `.collapsed` immediately; the DOM width animates,
			// so an offsetParent/size check alone lags a frame and misses the change.
			const root = leaf.getRoot();
			if (root === workspace.leftSplit && workspace.leftSplit.collapsed) return false;
			if (root === workspace.rightSplit && workspace.rightSplit.collapsed) return false;
			// Not in a collapsed dock — visible unless it's a hidden background tab.
			return leaf.view.containerEl.offsetParent !== null;
		});
	}

	onunload(): void {
		this.readingManager?.destroy();
		this.textToolbar?.destroy();
		activeDocument.body.removeClass("dc-hide-author", "dc-scheme-apple", "dc-compact-cards", "dc-suggesting");
		clearProfile();
		for (const el of this.editModeActions.values()) el.remove();
		this.editModeActions.clear();
	}

	private authorName(): string {
		return this.settings.author.trim() || "me";
	}

	async loadSettings(): Promise<void> {
		const data = ((await this.loadData()) as Partial<DocCommentsSettings> | null) ?? {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

const editorView = (editor: Editor): EditorView | null => {
	const cm = (editor as unknown as { cm?: unknown }).cm;
	return cm instanceof EditorView ? cm : null;
};

const editorViewFromLeaf = (leaf: WorkspaceLeaf): EditorView | null => {
	return leaf.view instanceof MarkdownView ? editorView(leaf.view.editor) : null;
};
