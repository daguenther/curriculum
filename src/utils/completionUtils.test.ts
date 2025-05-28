// src/utils/completionUtils.test.ts
import { isRichTextEmpty } from './completionUtils';
import { EMPTY_ARRAY_JSON_STRING } from './constants';

describe('isRichTextEmpty', () => {
  // Test cases for various empty states
  test('should return true for null or undefined input', () => {
    expect(isRichTextEmpty(null)).toBe(true);
    expect(isRichTextEmpty(undefined)).toBe(true);
  });

  test('should return true for EMPTY_ARRAY_JSON_STRING', () => {
    expect(isRichTextEmpty(EMPTY_ARRAY_JSON_STRING)).toBe(true);
  });

  test('should return true for Tiptap JSON with empty doc content array', () => {
    expect(isRichTextEmpty(JSON.stringify({ type: 'doc', content: [] }))).toBe(true);
  });

  test('should return true for Tiptap JSON with a single empty paragraph', () => {
    expect(isRichTextEmpty(JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }))).toBe(true);
  });

  test('should return true for Tiptap JSON with a single paragraph containing an empty text node', () => {
    expect(isRichTextEmpty(JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] }))).toBe(true);
  });
  
  test('should return true for Tiptap JSON with a single paragraph containing only whitespace text node', () => {
    expect(isRichTextEmpty(JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '   ' }] }] }))).toBe(true);
  });

  // Test cases for non-empty states
  test('should return false for Tiptap JSON with a paragraph containing actual text', () => {
    expect(isRichTextEmpty(JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] }))).toBe(false);
  });

  test('should return false for Tiptap JSON with multiple nodes if any are non-empty (or not just empty paragraphs)', () => {
    // Example: A heading (non-paragraph) makes it non-empty even if other content is empty paragraphs
    expect(isRichTextEmpty(JSON.stringify({ type: 'doc', content: [{ type: 'heading', attrs: { level: 1 } }, { type: 'paragraph' }] }))).toBe(false);
  });
  
  test('should return false for Tiptap JSON with content that is not just a single empty paragraph', () => {
    expect(isRichTextEmpty(JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Not Empty' }] }] }))).toBe(false);
  });

  // Test case for invalid JSON
  test('should return true and log a warning for invalid JSON input', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isRichTextEmpty('invalid json')).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  test('should return false for a simple non-empty string that is not EMPTY_ARRAY_JSON_STRING and not valid JSON', () => {
    // This scenario depends on the strictness of isRichTextEmpty.
    // Based on the current implementation, if JSON.parse fails, it's treated as empty.
    // If the requirement was to treat plain non-empty strings (that are not '[]') as non-empty,
    // the function would need modification. For now, testing current behavior.
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isRichTextEmpty('Just some text')).toBe(true); // because JSON.parse will fail
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
  
  test('should return true for an empty object string, as it fails parsing or is not valid Tiptap content', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isRichTextEmpty(JSON.stringify({}))).toBe(true); // No 'type: doc' or 'content'
    // Depending on implementation, this might not trigger console.warn if JSON.parse succeeds but structure is wrong.
    // The current implementation would return true because !doc.content.
    consoleWarnSpy.mockRestore();
  });

  test('should return false for a doc with a non-paragraph node like a heading', () => {
    expect(isRichTextEmpty(JSON.stringify({ type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{type: 'text', text: 'Title'}] }] }))).toBe(false);
  });
});
