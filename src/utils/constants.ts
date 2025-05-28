// src/utils/constants.ts

// For storing as stringified JSON in the data model (Course/Unit objects)
export const EMPTY_ARRAY_JSON_STRING = JSON.stringify([]);
export const EMPTY_RICH_TEXT_DATA = EMPTY_ARRAY_JSON_STRING;

// For initializing PlainText fields in the data model
export const EMPTY_PLAIN_TEXT_DATA = "";

// For inserting as actual Tiptap node content (an empty paragraph structure)
// This is an array of Tiptap JSONContent nodes.
export const EMPTY_PARAGRAPH_NODE_ARRAY: any[] = [{ type: 'paragraph', content: null }];