// src/utils/completionUtils.ts
import { EMPTY_ARRAY_JSON_STRING } from './constants';
import { type JSONContent } from '@tiptap/core';

/**
 * Checks if a string representing Tiptap JSON content is effectively empty.
 * 
 * "Empty" means:
 * - The string is equal to EMPTY_ARRAY_JSON_STRING ('[]').
 * - Or, if parsed as Tiptap JSON (e.g., { type: 'doc', content: [...] }):
 *   - doc.content is undefined or an empty array.
 *   - doc.content has one element, which is a paragraph (type: 'paragraph'), 
 *     and that paragraph itself has no `content` or its `content` array is empty.
 *   - doc.content has one element, a paragraph, with a single empty text node.
 * 
 * @param jsonString The stringified Tiptap JSON content.
 * @returns True if the content is considered empty, false otherwise.
 */
export function isRichTextEmpty(jsonString: string | undefined | null): boolean {
  if (jsonString === null || jsonString === undefined) {
    return true;
  }

  if (jsonString === EMPTY_ARRAY_JSON_STRING) {
    return true;
  }

  try {
    const doc = JSON.parse(jsonString) as JSONContent;

    if (!doc || !doc.content || doc.content.length === 0) {
      return true;
    }

    if (doc.content.length === 1) {
      const node = doc.content[0];
      if (node.type === 'paragraph') {
        if (!node.content || node.content.length === 0) {
          return true; // e.g., { type: 'doc', content: [{ type: 'paragraph' }] }
        }
        // Check for paragraph with a single empty text node
        // e.g., { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] }
        if (
          node.content.length === 1 &&
          node.content[0].type === 'text' &&
          (!node.content[0].text || node.content[0].text.trim() === '')
        ) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    // If parsing fails, it's likely not valid, non-empty Tiptap content.
    // Or it could be a plain string. If it's not '[]', and not parseable as a valid empty doc,
    // treat it as non-empty or log error. For this function's purpose, non-empty is safer.
    // However, the prompt stated: "If parsing fails, consider it empty or log an error and treat as empty."
    console.warn("Failed to parse JSON string in isRichTextEmpty, treating as empty:", jsonString, error);
    return true; 
  }
}
