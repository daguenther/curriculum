// src/components/CurriculumEditor/tiptapExtensions.ts
import { Node, mergeAttributes, Extension, Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link'; // Ensure Link is imported if you use it

// Import necessary items from courseSerializer and constants
// Adjust path as necessary if your serializer is elsewhere or you abstract fieldConfig
import { fieldConfig, FieldType } from './courseSerializer';
import { EMPTY_PARAGRAPH_NODE_ARRAY } from '../../utils/constants';

// --- UnmodifiableHeaderNode ---
export const UnmodifiableHeaderNode = Node.create({
  name: 'unmodifiableHeader',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      level: { default: 1, parseHTML: element => parseInt(element.getAttribute('data-level') || '1') },
      label: { default: '', parseHTML: element => element.getAttribute('data-label') || '' },
      fieldKey: { default: '', parseHTML: element => element.getAttribute('data-field-key') || '' },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-unmodifiable-header]', // Changed from h1/h2 to div for parsing consistency
        getAttrs: element => {
          const el = element as HTMLElement;
          return {
            level: parseInt(el.getAttribute('data-level') || '1', 10),
            label: el.getAttribute('data-label') || '',
            fieldKey: el.getAttribute('data-field-key') || '',
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { level, label, fieldKey, ...rest } = HTMLAttributes;
    let TagName: 'h1' | 'h2' | 'h3' | 'h4' = 'h3'; // Default
    if (level === 1) TagName = 'h1';
    if (level === 2) TagName = 'h2';
    // Note: The outer tag (TagName) is what Tiptap sees as the node.
    // The custom attributes help us identify it.
    return [
      TagName, // Main semantic tag
      mergeAttributes(rest, { // Attributes for the Hx tag
        'data-unmodifiable-header': 'true', // Identifier for this node type
        'data-level': String(level),
        'data-label': String(label), // Store label here for easier debugging/potential use
        'data-field-key': String(fieldKey),
        'contenteditable': 'false',
        style: `font-weight: bold; margin-top: 1em; margin-bottom: 0.2em; color: #333; user-select: none;`,
      }),
      String(label), // The visible label text
    ];
  },
});

// --- EditableHeaderNode ---
export const EditableHeaderNode = Node.create({
  name: 'editableHeader',
  group: 'block',
  content: 'inline*', // Allows text and marks, but not block content like new paragraphs
  addAttributes() {
    return {
      level: { default: 1, parseHTML: element => parseInt(element.getAttribute('data-level') || '1') },
      label: { default: '', parseHTML: element => element.querySelector('[data-header-label]')?.textContent || '' },
      fieldKey: { default: '', parseHTML: element => element.getAttribute('data-field-key') },
      sectionId: { default: null, parseHTML: element => element.getAttribute('data-section-id') }, // Added sectionId
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-editable-header]', // Wrapper div
        contentElement: '[data-header-value]', // Specifies where the editable content is
        getAttrs: (domNode) => {
          const element = domNode as HTMLElement;
          return {
            level: parseInt(element.getAttribute('data-level') || '1', 10),
            label: element.querySelector('[data-header-label]')?.textContent || '',
            fieldKey: element.getAttribute('data-field-key') || '',
            sectionId: element.getAttribute('data-section-id'), // Parse sectionId
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { level, label, fieldKey, sectionId, ...rest } = HTMLAttributes; // Destructure sectionId
    let TagName: 'h1' | 'h2' | 'h3' | 'h4' = 'h3';
    if (level === 1) TagName = 'h1';
    if (level === 2) TagName = 'h2';

    const attributesToMerge: Record<string, any> = {
      'data-editable-header': 'true',
      'data-level': String(level),
      'data-field-key': String(fieldKey),
      style: `font-weight: bold; margin-top: 1em; margin-bottom: 0.2em; display: flex; align-items: baseline;`,
    };

    if (sectionId) {
      attributesToMerge['data-section-id'] = sectionId; // Add data-section-id if present
    }

    return [
      TagName, // Use semantic heading tag for the entire block
      mergeAttributes(rest, attributesToMerge),
      [
        'span', // Static label part
        {
          'data-header-label': 'true',
          'contenteditable': 'false',
          style: 'margin-right: 0.5em; color: #555; user-select: none; font-weight: normal;', // Ensure label is not double-bolded
        },
        `${label}`,
      ],
      [
        'span', // Editable value part
        {
          'data-header-value': 'true',
          style: 'flex-grow: 1; outline: none; min-width: 100px; font-weight: normal;', // Ensure value part is not double-bolded
        },
        0, // This is where Tiptap renders the node's actual editable content
      ],
    ];
  },
});

// --- AddUnitCommand Extension ---
function createNewUnitTiptapJson(unitIndex: number): any[] {
  const newUnitNodes: any[] = [];
  const unitBaseKey = `unit.${unitIndex}`;
  const defaultUnitName = `New Unit ${unitIndex + 1}`;

  // 1. Unit Name (Editable Header)
  const unitNameConfig = fieldConfig.unit.unitName;
  if (!unitNameConfig) {
    console.error("Unit name configuration is missing in fieldConfig.unit.unitName");
    return []; // Or handle error appropriately
  }
  newUnitNodes.push({
    type: 'editableHeader',
    attrs: {
      label: unitNameConfig.label,
      level: 2, // Standard level for unit names
      fieldKey: `${unitBaseKey}.unitName`,
    },
    content: [{ type: 'text', text: defaultUnitName }],
  });

  // 2. Subsequent Unmodifiable Headers and their empty content areas
  Object.keys(fieldConfig.unit).forEach(fieldKeyName => {
    if (fieldKeyName === 'unitName') return; // Already handled

    const config = fieldConfig.unit[fieldKeyName];
    if (!config) {
      console.error(`Configuration is missing for unit field: ${fieldKeyName}`);
      return; // Skip this field if config is missing
    }
    const fullFieldKey = `${unitBaseKey}.${fieldKeyName}`;

    newUnitNodes.push({
      type: 'unmodifiableHeader',
      attrs: {
        label: config.label,
        level: 3, // Standard level for sections within a unit
        fieldKey: fullFieldKey,
      },
    });
    // Add empty content placeholder (an empty paragraph array)
    newUnitNodes.push(...EMPTY_PARAGRAPH_NODE_ARRAY);
  });
  return newUnitNodes;
}

export const AddUnitCommandExtension = Extension.create({
  name: 'addUnitCommandExtension',
  addCommands() {
    return {
      addUnit: () => ({ editor, chain }) => {
        let maxUnitIndex = -1;
        editor.state.doc.descendants((node) => {
          const nodeFieldKey = node.attrs.fieldKey;
          if (nodeFieldKey && typeof nodeFieldKey === 'string') {
            const parts = nodeFieldKey.split('.');
            if (parts[0] === 'unit' && parts.length > 1) {
              const idx = parseInt(parts[1], 10);
              if (!isNaN(idx) && idx > maxUnitIndex) {
                maxUnitIndex = idx;
              }
            }
          }
          return true;
        });
        const newUnitIndex = maxUnitIndex + 1;
        const newUnitJsonNodes = createNewUnitTiptapJson(newUnitIndex);

        if (newUnitJsonNodes.length === 0) {
            console.error("Failed to generate nodes for new unit.");
            return false; // Indicate command failure
        }

        return chain()
          .insertContentAt(editor.state.doc.content.size, newUnitJsonNodes) // Insert at the end
          // .focus() // Optional: focus editor
          // .scrollIntoView() // Optional: scroll to new unit
          .run();
      },
    };
  },
});

export const editorExtensions = [
  StarterKit.configure({
    // heading: false, // Disable default Tiptap headings if you only use custom ones
    // You might want to configure other StarterKit extensions here if needed
    // For example, to disable some default keyboard shortcuts if they conflict
  }),
  Link.configure({ // Example: configure Link extension
    openOnClick: true,
    autolink: true,
  }),
  
  UnmodifiableHeaderNode,
  EditableHeaderNode,
  Placeholder.configure({
    emptyEditorClass: 'is-editor-empty', // Class for the entire editor when empty
    placeholder: ({ node, editor }) => {
      // General placeholder for the entire editor if it's completely empty
      if (editor.isEmpty) {
        return 'Start building your curriculum here...';
      }

      // Placeholder for empty editable header values
      if (node.type.name === 'editableHeader' && node.content.size === 0) {
        return 'Enter text here...'; // Changed
      }

      // Placeholder for standard empty paragraphs that are direct children of the doc
      // and not part of other structures like list items, blockquotes etc.
      // and not inside an editableHeader (already handled)
      // Ensure node.parent exists before checking node.parent.type.name
      if (node.type.name === 'paragraph' && node.content.size === 0 && node.parent && node.parent.type.name === 'doc') {
          return 'Enter text here...'; // Changed
      }

      return null; // No placeholder for other cases
    },
    includeChildren: true, // Important for nested structures if any
  }),
  AddUnitCommandExtension,
];