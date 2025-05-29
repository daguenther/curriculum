// src/components/CurriculumEditor/tiptapExtensions.ts
import { Node, mergeAttributes, Extension } from '@tiptap/core'; // Editor removed as not directly used in this file's top-level scope
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';

// Import necessary items from courseSerializer and constants
// Adjust path as necessary if your serializer is elsewhere or you abstract fieldConfig
import { fieldConfig } from './courseSerializer'; // FieldType not directly used in this file currently
import { EMPTY_PARAGRAPH_NODE_ARRAY } from '../../utils/constants';

// --- UnmodifiableHeaderNode ---
export const UnmodifiableHeaderNode = Node.create({
  name: 'unmodifiableHeader',
  group: 'block',
  atom: true, // Content is not directly editable by Tiptap, label is rendered via renderHTML
  draggable: false, // Typically, these structural headers shouldn't be draggable
  addAttributes() {
    return {
      level: { default: 1, parseHTML: element => parseInt(element.getAttribute('data-level') || '1', 10) },
      label: { default: '', parseHTML: element => element.getAttribute('data-label') || '' },
      fieldKey: { default: '', parseHTML: element => element.getAttribute('data-field-key') || '' },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-unmodifiable-header="true"]', // More specific selector
        // We use a div wrapper because Tiptap's parseHTML for atom nodes often expects a single root element
        // that represents the node. The actual Hx tag is rendered inside.
        getAttrs: element => {
          const el = element as HTMLElement;
          // The Hx tag is the first child if renderHTML creates it as such
          const headerTag = el.firstElementChild as HTMLElement;
          return {
            level: parseInt(headerTag?.getAttribute('data-level') || el.getAttribute('data-level') || '1', 10),
            label: headerTag?.getAttribute('data-label') || el.getAttribute('data-label') || headerTag?.textContent || '',
            fieldKey: headerTag?.getAttribute('data-field-key') || el.getAttribute('data-field-key') || '',
          };
        },
      },
      // Fallback for direct Hx tags if necessary, though div wrapper is preferred for atoms
      { tag: 'h1[data-unmodifiable-header="true"]', getAttrs: commonHeaderGetAttrs },
      { tag: 'h2[data-unmodifiable-header="true"]', getAttrs: commonHeaderGetAttrs },
      { tag: 'h3[data-unmodifiable-header="true"]', getAttrs: commonHeaderGetAttrs },
      { tag: 'h4[data-unmodifiable-header="true"]', getAttrs: commonHeaderGetAttrs },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    const { level, label, fieldKey, ...rest } = HTMLAttributes;
    let TagName: 'h1' | 'h2' | 'h3' | 'h4' = 'h3';
    if (Number(level) === 1) TagName = 'h1';
    if (Number(level) === 2) TagName = 'h2';
    if (Number(level) === 4) TagName = 'h4';

    // For atom: true, Tiptap wraps this output. The outer div is for parsing.
    // The actual Hx tag is what's visually represented.
    return [
      TagName,
      mergeAttributes(rest, {
        'data-unmodifiable-header': 'true',
        'data-level': String(level),
        'data-label': String(label),
        'data-field-key': String(fieldKey),
        'contenteditable': 'false',
        style: `font-weight: bold; margin-top: 1em; margin-bottom: 0.2em; color: #333; user-select: none; cursor: default;`,
      }),
      String(label), // The visible label text
    ];
  },
});

// Helper for Hx tag parsing if not using a div wrapper
function commonHeaderGetAttrs(element: HTMLElement) {
  return {
    level: parseInt(element.tagName.charAt(1), 10) || parseInt(element.getAttribute('data-level') || '1', 10),
    label: element.getAttribute('data-label') || element.textContent || '',
    fieldKey: element.getAttribute('data-field-key') || '',
    // Add sectionId parsing if applicable here too
    sectionId: element.getAttribute('data-section-id') || null,
  };
}


// --- EditableHeaderNode ---
export const EditableHeaderNode = Node.create({
  name: 'editableHeader',
  group: 'block',
  content: 'inline*', // Allows text and marks
  draggable: false,
  addAttributes() {
    return {
      level: { default: 1, parseHTML: element => parseInt(element.getAttribute('data-level') || '1', 10) },
      label: { default: '', parseHTML: element => element.querySelector('[data-header-label]')?.textContent || '' },
      fieldKey: { default: '', parseHTML: element => element.getAttribute('data-field-key') || '' },
      sectionId: { default: null, parseHTML: element => element.getAttribute('data-section-id') || null },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-editable-header="true"]', // Match the div wrapper
        contentElement: '[data-header-value]', // Editable content is inside the span with this attribute
        getAttrs: (domNode) => {
          const element = domNode as HTMLElement;
          // The Hx tag is the first child of the div wrapper.
          const headerTag = element.firstElementChild as HTMLElement;
          return {
            level: parseInt(headerTag?.getAttribute('data-level') || element.getAttribute('data-level') || '1', 10),
            label: headerTag?.querySelector('[data-header-label]')?.textContent || element.querySelector('[data-header-label]')?.textContent || '',
            fieldKey: headerTag?.getAttribute('data-field-key') || element.getAttribute('data-field-key') || '',
            sectionId: headerTag?.getAttribute('data-section-id') || element.getAttribute('data-section-id') || null,
          };
        },
      },
      // Fallbacks for direct Hx if needed, but div wrapper is more robust for complex renderHTML
      { tag: 'h1[data-editable-header="true"]', contentElement: '[data-header-value]', getAttrs: commonHeaderGetAttrs },
      { tag: 'h2[data-editable-header="true"]', contentElement: '[data-header-value]', getAttrs: commonHeaderGetAttrs },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    const { level, label, fieldKey, sectionId, ...rest } = HTMLAttributes;
    let TagName: 'h1' | 'h2' | 'h3' | 'h4' = 'h3'; // Default based on your serializer
    if (Number(level) === 1) TagName = 'h1';
    if (Number(level) === 2) TagName = 'h2';
    if (Number(level) === 4) TagName = 'h4';


    const wrapperAttributes: Record<string, any> = {
        'data-editable-header': 'true', // On the outer div wrapper
        // These attributes are more for semantic value on the Hx tag itself
        // but Tiptap needs them on the node it directly manages.
    };
     if (sectionId) {
        wrapperAttributes['id'] = String(sectionId); // Add ID directly to the wrapper for querySelector
        wrapperAttributes['data-section-id'] = String(sectionId);
    }


    return [
      'div', // Outer div wrapper that Tiptap directly manages as the node
      mergeAttributes(rest, wrapperAttributes), // rest might include class etc. from editor state
      [ // Actual Hx tag structure goes inside the div
        TagName,
        {
          // Store data attributes on Hx tag for clarity and potential direct DOM query
          'data-level': String(level),
          'data-field-key': String(fieldKey),
          style: `font-weight: bold; margin-top: 1em; margin-bottom: 0.2em; display: flex; align-items: baseline; cursor: text;`,
          // If sectionId is used for scrolling, it should be on an element Tiptap renders.
          // If the div wrapper gets the ID, that's fine. If Hx needs it:
          // ...(sectionId ? { id: String(sectionId), 'data-section-id': String(sectionId) } : {})
        },
        [
          'span',
          {
            'data-header-label': 'true',
            'contenteditable': 'false',
            style: 'margin-right: 0.5em; color: #555; user-select: none; font-weight: normal;',
          },
          `${label}`,
        ],
        [
          'span', // This span becomes the contentDOM for Tiptap
          {
            'data-header-value': 'true',
            // contenteditable is implicitly true here because of content: 'inline*' and this being the contentDOM
            style: 'flex-grow: 1; outline: none; min-width: 100px; font-weight: normal; display: inline-block;',
          },
          0, // Represents the hole for Tiptap's content rendering
        ],
      ],
    ];
  },
});


// --- AddUnitCommand Extension ---
// This function creates the Tiptap JSON for a new unit.
// It relies on fieldConfig from courseSerializer.ts
function createNewUnitTiptapJson(newUnitId: string, newUnitIndexForLabel: number): any[] {
  const newUnitNodes: any[] = [];
  const defaultUnitName = `New Unit ${newUnitIndexForLabel}`;

  // 1. Unit Name (Editable Header)
  const unitNameConfig = fieldConfig.unit.unitName;
  if (!unitNameConfig) {
    console.error("Unit name configuration is missing in fieldConfig.unit.unitName");
    return [];
  }
  newUnitNodes.push({
    type: 'editableHeader',
    attrs: {
      label: unitNameConfig.label,
      level: unitNameConfig.defaultLevel || 2,
      fieldKey: `unit.${newUnitId}.unitName`, // Use the actual newUnitId
      sectionId: newUnitId, // Crucial for tab navigation
    },
    content: [{ type: 'text', text: defaultUnitName }],
  });

  // 2. Time Allotted (Unmodifiable Header + Paragraph for content)
  const timeAllottedConfig = fieldConfig.unit.timeAllotted;
  if (timeAllottedConfig) {
    newUnitNodes.push({
      type: 'unmodifiableHeader',
      attrs: {
        label: timeAllottedConfig.label,
        level: 3, // Consistent level for sub-sections
        fieldKey: `unit.${newUnitId}.timeAllotted.header`,
      },
    });
    newUnitNodes.push({ type: 'paragraph', content: [{ type: 'text', text: 'Specify time'}] }); // Default text
  }


  // 3. Subsequent RichText Unmodifiable Headers and their empty content areas
  (Object.keys(fieldConfig.unit) as Array<keyof typeof fieldConfig.unit>).forEach(fieldKeyName => {
    // Skip fields already handled or not RichText
    if (fieldKeyName === 'unitName' || fieldKeyName === 'timeAllotted') return;

    const config = fieldConfig.unit[fieldKeyName];
    if (!config || config.type !== 'RichText') { // Assuming 'RichText' is a value in your FieldType enum
      // console.warn(`Skipping or config issue for unit field: ${String(fieldKeyName)}`);
      return;
    }

    newUnitNodes.push({
      type: 'unmodifiableHeader',
      attrs: {
        label: config.label,
        level: 3, // Standard level for sections within a unit
        fieldKey: `unit.${newUnitId}.${String(fieldKeyName)}.header`,
      },
    });
    // Add empty content placeholder (an empty paragraph array)
    newUnitNodes.push(...EMPTY_PARAGRAPH_NODE_ARRAY);
  });
  return newUnitNodes;
}

// This extension is intended to be called *after* the unit is added to the App's state (currentCourse)
// and the editor's content is re-rendered via setContent(courseToTiptapJson(newCourse)).
// The command provided here is more of a fallback or a direct Tiptap manipulation,
// which might conflict with the React state-driven approach if not managed carefully.
// For your current setup where App.tsx handles adding units to `currentCourse` and
// `CurriculumEditor` re-renders, a Tiptap command to "add unit" like this is less necessary
// and might be duplicative.
// However, if you wanted a button *inside* Tiptap to add a new unit section directly, this is how you'd start.
export const AddUnitCommandExtension = Extension.create({
  name: 'addUnitCommandViaTiptap', // Renamed to clarify its nature
  addCommands() {
    return {
      // This command is more for direct Tiptap manipulation.
      // Your current app flow (add unit in App.tsx -> update currentCourse -> re-render editor)
      // is likely preferred for React state consistency.
      // This command is left as an example of how one *could* do it via Tiptap.
      addUnitDirectlyInTiptap: (newUnitIdFromApp: string, newUnitIndexForLabel: number) => {
        return ({ editor, chain }) => { // Return the object with editor and chain directly
          // This command assumes it's being called with a pre-generated ID from the app state management.
          if (!newUnitIdFromApp) {
              console.error("addUnitDirectlyInTiptap: newUnitIdFromApp is required.");
              return false;
          }
          const newUnitJsonNodes = createNewUnitTiptapJson(newUnitIdFromApp, newUnitIndexForLabel);

          if (newUnitJsonNodes.length === 0) {
              console.error("Failed to generate nodes for new unit.");
              return false;
          }

          // You'll need to decide how you want to insert these nodes into the editor.
          // Common methods include:
          // - editor.commands.insertContent(newUnitJsonNodes)
          // - editor.commands.insertContentAt(position, newUnitJsonNodes)
          // - chain().insertContent(...).run()
          // The best approach depends on where you want the new unit to appear.

          // For now, as a placeholder, let's just log the nodes:
          console.log("Generated new unit nodes:", newUnitJsonNodes);

          // Return true if the command was successful, false otherwise
          return true;
        };
      },
    };
  },
});


export const editorExtensions = [
  StarterKit.configure({
    // heading: false, // Consider disabling default heading if you exclusively use custom ones
    // You might want to configure other StarterKit extensions here if needed
  }),
  Link.configure({
    openOnClick: true,
    autolink: true,
    linkOnPaste: true, // Good UX
  }),
  UnmodifiableHeaderNode,
  EditableHeaderNode,
  Placeholder.configure({
    emptyEditorClass: 'is-editor-empty',
    placeholder: ({ node, editor }) => {
      if (editor.isEmpty && node.type.name === 'doc') { // Placeholder for the entire empty document
        return 'Start building your curriculum here...';
      }
      // Placeholder for empty editable header values
      if (node.type.name === 'editableHeader' && node.content.size === 0) {
        return 'Enter text...'; // Placeholder specifically for the editable part
      }
      // Placeholder for standard empty paragraphs that are direct children of the doc
      if (node.type.name === 'paragraph' && node.content.size === 0 && node.parent && node.parent.type.name === 'doc') {
          // Check if it's an empty paragraph directly after an unmodifiable header
          const pos = editor.state.doc.resolve(node.pos);
          if (pos.pos > 0) {
            const nodeBefore = editor.state.doc.nodeAt(pos.pos -1 -1); // node.pos is start, -1 is before, another -1 for node itself
            if (nodeBefore && nodeBefore.type.name === 'unmodifiableHeader') {
                 return 'Enter content for this section...';
            }
          }
          return 'Type something...';
      }
      return null;
    },
    includeChildren: true, // Process placeholders for child nodes as well
  }),
  // AddUnitCommandExtension, // Only include if you intend to use the direct Tiptap command.
                           // Your current flow in App.tsx handles unit addition at the state level,
                           // which then re-renders the editor with new content.
                           // Including this command might be redundant or lead to confusion unless
                           // you have a specific use case for a Tiptap-native "add unit" button.
];