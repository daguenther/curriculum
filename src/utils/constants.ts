// src/utils/constants.ts

// For storing as stringified JSON in the data model (Course/Unit objects)
// This typically represents an empty "doc" with no content, or an empty array of nodes.
// '[]' is often used to signify "no block nodes here".
export const EMPTY_ARRAY_JSON_STRING = JSON.stringify([]);

// If you want a default for rich text fields that represents an empty Tiptap document
// with one empty paragraph, it would be stringified.
// export const EMPTY_RICH_TEXT_DOCUMENT_STRING = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
// For now, let's assume EMPTY_ARRAY_JSON_STRING is the primary one for database storage of empty rich text.
export const EMPTY_RICH_TEXT_DATA = EMPTY_ARRAY_JSON_STRING;


// For initializing PlainText fields in the data model
export const EMPTY_PLAIN_TEXT_DATA = "";

// For inserting as actual Tiptap node content (an empty paragraph structure)
// This is an array of Tiptap JSONContent nodes, specifically a single empty paragraph.
// This is the one used by your `AddUnitCommandExtension`.
export const EMPTY_PARAGRAPH_NODE_ARRAY: any[] = [{ type: 'paragraph' }];
// Alternatively, and perhaps safer:
// export const EMPTY_PARAGRAPH_NODE_ARRAY: any[] = [{ type: 'paragraph', content: [] }];

// If you specifically need the structure for a full empty Tiptap document (for setContent, for example):
export const EMPTY_TIPTAP_DOCUMENT_JSON: object = { // Corrected variable name here
  type: 'doc',
  content: [{ type: 'paragraph' }], // A document with one empty paragraph
};