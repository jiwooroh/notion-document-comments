// Extracted from the upstream stylesheet. Inject only rules for registered highlights.
export const HIGHLIGHT_RULES: ReadonlyArray<{ names: string[]; css: string }> = [
  {
    "names": [
      "notion-style-comments-table"
    ],
    "css": "::highlight(notion-style-comments-table) {\n\tbackground-color: var(--dc-highlight-bg);\n}"
  },
  {
    "names": [
      "notion-style-comments-table"
    ],
    "css": "body.dc-annotation-underline ::highlight(notion-style-comments-table) {\n\tbackground-color: transparent;\n\ttext-decoration: underline;\n}"
  },
  {
    "names": [
      "notion-style-comments-table"
    ],
    "css": "body.dc-annotation-both ::highlight(notion-style-comments-table) {\n\ttext-decoration: underline;\n}"
  },
  {
    "names": [
      "notion-style-comments-table-resolved"
    ],
    "css": "::highlight(notion-style-comments-table-resolved) {\n\tbackground-color: hsla(0, 0%, 50%, 0.12);\n\ttext-decoration: underline;\n}"
  },
  {
    "names": [
      "nsc-html-default-default",
      "nsc-html-default-highlight",
      "nsc-html-default-both"
    ],
    "css": "::highlight(nsc-html-default-default),\n::highlight(nsc-html-default-highlight),\n::highlight(nsc-html-default-both) {\n\tbackground-color: var(--dc-highlight-bg);\n}"
  },
  {
    "names": [
      "nsc-html-default-underline",
      "nsc-html-default-both",
      "nsc-html-default-default",
      "nsc-html-default-default"
    ],
    "css": "::highlight(nsc-html-default-underline),\n::highlight(nsc-html-default-both),\nbody.dc-annotation-underline ::highlight(nsc-html-default-default),\nbody.dc-annotation-both ::highlight(nsc-html-default-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-highlight-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-default-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-default-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-theme-default",
      "nsc-html-theme-highlight",
      "nsc-html-theme-both"
    ],
    "css": "::highlight(nsc-html-theme-default),\n::highlight(nsc-html-theme-highlight),\n::highlight(nsc-html-theme-both) {\n\tbackground-color: var(--dc-hl-theme);\n}"
  },
  {
    "names": [
      "nsc-html-theme-underline",
      "nsc-html-theme-both",
      "nsc-html-theme-default",
      "nsc-html-theme-default"
    ],
    "css": "::highlight(nsc-html-theme-underline),\n::highlight(nsc-html-theme-both),\nbody.dc-annotation-underline ::highlight(nsc-html-theme-default),\nbody.dc-annotation-both ::highlight(nsc-html-theme-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-theme-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-theme-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-theme-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-yellow-default",
      "nsc-html-yellow-highlight",
      "nsc-html-yellow-both"
    ],
    "css": "::highlight(nsc-html-yellow-default),\n::highlight(nsc-html-yellow-highlight),\n::highlight(nsc-html-yellow-both) {\n\tbackground-color: var(--dc-hl-yellow);\n}"
  },
  {
    "names": [
      "nsc-html-yellow-underline",
      "nsc-html-yellow-both",
      "nsc-html-yellow-default",
      "nsc-html-yellow-default"
    ],
    "css": "::highlight(nsc-html-yellow-underline),\n::highlight(nsc-html-yellow-both),\nbody.dc-annotation-underline ::highlight(nsc-html-yellow-default),\nbody.dc-annotation-both ::highlight(nsc-html-yellow-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-yellow-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-yellow-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-yellow-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-green-default",
      "nsc-html-green-highlight",
      "nsc-html-green-both"
    ],
    "css": "::highlight(nsc-html-green-default),\n::highlight(nsc-html-green-highlight),\n::highlight(nsc-html-green-both) {\n\tbackground-color: var(--dc-hl-green);\n}"
  },
  {
    "names": [
      "nsc-html-green-underline",
      "nsc-html-green-both",
      "nsc-html-green-default",
      "nsc-html-green-default"
    ],
    "css": "::highlight(nsc-html-green-underline),\n::highlight(nsc-html-green-both),\nbody.dc-annotation-underline ::highlight(nsc-html-green-default),\nbody.dc-annotation-both ::highlight(nsc-html-green-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-green-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-green-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-green-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-blue-default",
      "nsc-html-blue-highlight",
      "nsc-html-blue-both"
    ],
    "css": "::highlight(nsc-html-blue-default),\n::highlight(nsc-html-blue-highlight),\n::highlight(nsc-html-blue-both) {\n\tbackground-color: var(--dc-hl-blue);\n}"
  },
  {
    "names": [
      "nsc-html-blue-underline",
      "nsc-html-blue-both",
      "nsc-html-blue-default",
      "nsc-html-blue-default"
    ],
    "css": "::highlight(nsc-html-blue-underline),\n::highlight(nsc-html-blue-both),\nbody.dc-annotation-underline ::highlight(nsc-html-blue-default),\nbody.dc-annotation-both ::highlight(nsc-html-blue-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-blue-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-blue-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-blue-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-purple-default",
      "nsc-html-purple-highlight",
      "nsc-html-purple-both"
    ],
    "css": "::highlight(nsc-html-purple-default),\n::highlight(nsc-html-purple-highlight),\n::highlight(nsc-html-purple-both) {\n\tbackground-color: var(--dc-hl-purple);\n}"
  },
  {
    "names": [
      "nsc-html-purple-underline",
      "nsc-html-purple-both",
      "nsc-html-purple-default",
      "nsc-html-purple-default"
    ],
    "css": "::highlight(nsc-html-purple-underline),\n::highlight(nsc-html-purple-both),\nbody.dc-annotation-underline ::highlight(nsc-html-purple-default),\nbody.dc-annotation-both ::highlight(nsc-html-purple-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-purple-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-purple-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-purple-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-pink-default",
      "nsc-html-pink-highlight",
      "nsc-html-pink-both"
    ],
    "css": "::highlight(nsc-html-pink-default),\n::highlight(nsc-html-pink-highlight),\n::highlight(nsc-html-pink-both) {\n\tbackground-color: var(--dc-hl-pink);\n}"
  },
  {
    "names": [
      "nsc-html-pink-underline",
      "nsc-html-pink-both",
      "nsc-html-pink-default",
      "nsc-html-pink-default"
    ],
    "css": "::highlight(nsc-html-pink-underline),\n::highlight(nsc-html-pink-both),\nbody.dc-annotation-underline ::highlight(nsc-html-pink-default),\nbody.dc-annotation-both ::highlight(nsc-html-pink-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-pink-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-pink-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-pink-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-red-default",
      "nsc-html-red-highlight",
      "nsc-html-red-both"
    ],
    "css": "::highlight(nsc-html-red-default),\n::highlight(nsc-html-red-highlight),\n::highlight(nsc-html-red-both) {\n\tbackground-color: var(--dc-hl-red);\n}"
  },
  {
    "names": [
      "nsc-html-red-underline",
      "nsc-html-red-both",
      "nsc-html-red-default",
      "nsc-html-red-default"
    ],
    "css": "::highlight(nsc-html-red-underline),\n::highlight(nsc-html-red-both),\nbody.dc-annotation-underline ::highlight(nsc-html-red-default),\nbody.dc-annotation-both ::highlight(nsc-html-red-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-red-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-red-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-red-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-orange-default",
      "nsc-html-orange-highlight",
      "nsc-html-orange-both"
    ],
    "css": "::highlight(nsc-html-orange-default),\n::highlight(nsc-html-orange-highlight),\n::highlight(nsc-html-orange-both) {\n\tbackground-color: var(--dc-hl-orange);\n}"
  },
  {
    "names": [
      "nsc-html-orange-underline",
      "nsc-html-orange-both",
      "nsc-html-orange-default",
      "nsc-html-orange-default"
    ],
    "css": "::highlight(nsc-html-orange-underline),\n::highlight(nsc-html-orange-both),\nbody.dc-annotation-underline ::highlight(nsc-html-orange-default),\nbody.dc-annotation-both ::highlight(nsc-html-orange-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-orange-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-orange-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-orange-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-brown-default",
      "nsc-html-brown-highlight",
      "nsc-html-brown-both"
    ],
    "css": "::highlight(nsc-html-brown-default),\n::highlight(nsc-html-brown-highlight),\n::highlight(nsc-html-brown-both) {\n\tbackground-color: var(--dc-hl-brown);\n}"
  },
  {
    "names": [
      "nsc-html-brown-underline",
      "nsc-html-brown-both",
      "nsc-html-brown-default",
      "nsc-html-brown-default"
    ],
    "css": "::highlight(nsc-html-brown-underline),\n::highlight(nsc-html-brown-both),\nbody.dc-annotation-underline ::highlight(nsc-html-brown-default),\nbody.dc-annotation-both ::highlight(nsc-html-brown-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-brown-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-brown-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-brown-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-gray-default",
      "nsc-html-gray-highlight",
      "nsc-html-gray-both"
    ],
    "css": "::highlight(nsc-html-gray-default),\n::highlight(nsc-html-gray-highlight),\n::highlight(nsc-html-gray-both) {\n\tbackground-color: var(--dc-hl-gray);\n}"
  },
  {
    "names": [
      "nsc-html-gray-underline",
      "nsc-html-gray-both",
      "nsc-html-gray-default",
      "nsc-html-gray-default"
    ],
    "css": "::highlight(nsc-html-gray-underline),\n::highlight(nsc-html-gray-both),\nbody.dc-annotation-underline ::highlight(nsc-html-gray-default),\nbody.dc-annotation-both ::highlight(nsc-html-gray-default) {\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-hl-gray-border) 55%, transparent);\n}"
  },
  {
    "names": [
      "nsc-html-gray-default"
    ],
    "css": "body.dc-annotation-underline ::highlight(nsc-html-gray-default) {\n\tbackground-color: transparent;\n}"
  },
  {
    "names": [
      "nsc-html-resolved"
    ],
    "css": "::highlight(nsc-html-resolved) {\n\ttext-decoration: underline 1px dashed var(--text-faint);\n}"
  },
  {
    "names": [
      "notion-style-comments-table-suggest-insert",
      "nsc-html-default-suggest-insert"
    ],
    "css": "::highlight(notion-style-comments-table-suggest-insert),\n::highlight(nsc-html-default-suggest-insert) {\n\tbackground-color: transparent;\n\tcolor: var(--dc-suggest-insert);\n\ttext-decoration: underline 2px color-mix(in srgb, var(--dc-suggest-insert) 55%, transparent);\n}"
  },
  {
    "names": [
      "notion-style-comments-table-suggest-delete",
      "nsc-html-default-suggest-delete"
    ],
    "css": "::highlight(notion-style-comments-table-suggest-delete),\n::highlight(nsc-html-default-suggest-delete) {\n\tbackground-color: transparent;\n\tcolor: var(--dc-suggest-delete);\n\ttext-decoration: line-through 1.5px var(--dc-suggest-delete);\n}"
  }
];
