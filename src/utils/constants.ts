// src/utils/constants.ts

export const EMPTY_ARRAY_JSON_STRING = JSON.stringify([]);

// For inserting as actual Tiptap node content (an empty paragraph structure)
export const EMPTY_PARAGRAPH_NODE_ARRAY: any[] = [{ type: 'paragraph', content: [] }];

// Full empty Tiptap document (for setContent, for example):
export const EMPTY_TIPTAP_DOCUMENT_JSON: object = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
};