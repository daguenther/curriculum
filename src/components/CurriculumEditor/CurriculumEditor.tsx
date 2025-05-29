// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from './tiptapExtensions';
import { type Course } from '../../types';
import { courseToTiptapJson } from './courseSerializer';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { Button, Paper, Group, Stack, Title, Box, Tooltip, type MantineTheme } from '@mantine/core';
import { IconDeviceFloppy, IconMarkdown, IconCheck, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { tiptapJsonToMarkdown } from '../../utils/tiptapToMarkdown';

interface CurriculumEditorProps {
  initialCourseData: Course;
  onSave: (editorContent: JSONContent) => Promise<void>;
  courseId: string;
}

export interface CurriculumEditorRef {
  triggerAddUnit: () => void;
  triggerCopyMarkdown: () => void;
  triggerSuggestChanges: () => void;
  scrollToSection: (sectionId: string) => void; // Added for scrolling
  // getEditorContent: () => JSONContent | null; // Alternative approach, not used for now
}

const CurriculumEditor = forwardRef<CurriculumEditorRef, CurriculumEditorProps>(
  ({ initialCourseData, onSave, courseId }, ref) => {
    const editor = useEditor({
      // immediatelyRender: false, // Default is true. Let's test with true or removing it.
                                // If issues arise with DOM not being ready, can revert or use other strategies.
                                // For now, relying on editorKey and activeTab in App.tsx useEffect.
      extensions: editorExtensions,
    content: '',
    editable: true,
  });

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (initialCourseData && editor && !editor.isDestroyed) {
      const tiptapJson = courseToTiptapJson(initialCourseData);
      editor.commands.setContent(tiptapJson, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCourseData, editor]);

  // Internal handlers, will be triggered by exposed methods
  const internalHandleCopyAsMarkdown = async () => {
    if (!editor) return;
    try {
      const editorJson = editor.getJSON();
      const markdownText = tiptapJsonToMarkdown(editorJson);
      if (!markdownText.trim()) {
        notifications.show({ title: 'Nothing to Copy', message: 'The content is empty.', color: 'yellow' });
        return;
      }
      await navigator.clipboard.writeText(markdownText);
      notifications.show({ title: 'Copied as Markdown!', message: 'Content copied to clipboard.', color: 'green', icon: <IconCheck size={18} /> });
    } catch (err) {
      console.error('Failed to copy as Markdown: ', err);
      notifications.show({ title: 'Copy Failed', message: 'Could not copy content.', color: 'red' });
    }
  };

  const internalHandleAddUnit = () => {
    if (editor && editor.commands.addUnit) {
      editor.chain().focus().addUnit().run();
    } else {
      console.error("addUnit command not available on editor.");
      notifications.show({ title: 'Error', message: 'Cannot add unit. Command not available.', color: 'red' });
    }
  };

  const internalHandleSuggestChanges = () => {
    if (editor) {
      const jsonContent = editor.getJSON();
      onSaveRef.current(jsonContent); // Call the onSave prop passed from App.tsx
    }
  };

  useImperativeHandle(ref, () => ({
    triggerAddUnit: () => {
      internalHandleAddUnit();
    },
    triggerCopyMarkdown: async () => {
      await internalHandleCopyAsMarkdown();
    },
    triggerSuggestChanges: () => {
      internalHandleSuggestChanges();
    },
    scrollToSection: (sectionId: string) => {
      if (!editor || editor.isDestroyed) {
        console.warn(`scrollToSection: Editor not available or destroyed (sectionId: ${sectionId}).`);
        return;
      }
      // Attempt to find the element.
      // editor.view.dom is the root ProseMirror editable element.
      const element = editor.view.dom.querySelector(`[data-section-id="${sectionId}"]`);
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback or warning if element not found. This might happen if content rendering is delayed.
        console.warn(`scrollToSection: Element with data-section-id="${sectionId}" not found. Attempting scroll on next frame.`);
        // As a fallback, try after a very short delay, in case the DOM wasn't fully ready.
        // This is a common pattern but should be used cautiously.
        // The editorKey change in App.tsx should ideally handle most race conditions.
        requestAnimationFrame(() => {
          const elementRetry = editor.view.dom.querySelector(`[data-section-id="${sectionId}"]`);
          if (elementRetry) {
            elementRetry.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            console.error(`scrollToSection: Element with data-section-id="${sectionId}" still not found after retry.`);
          }
        });
      }
    },
    // getEditorContent: () => { // Alternative approach
    //   return editor ? editor.getJSON() : null;
    // }
  }));

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  // The Paper element with buttons is removed from here
  return (
    <Stack>
       {/* The Paper with Title and action buttons has been removed */}
       {/* Title is now part of AppShell.Header, buttons are also in AppShell.Header */}
       {/* We might want a small header here, or rely on the global one */}
       <Paper p="sm" shadow="xs" withBorder mb="md">
        <Title order={4}>Editing: {initialCourseData.title} ({initialCourseData.name})</Title>
      </Paper>
      <RichTextEditor
        editor={editor}
        styles={(theme: MantineTheme) => ({
          // Styles for the root of RichTextEditor.Toolbar
          toolbar: {
            // Direct styles for the toolbar container if needed
            // e.g., borderBottom: `1px solid ${theme.colors.gray[3]}`,
          },
          // Styles for each individual control button within the toolbar
          control: {
            padding: `calc(${theme.spacing.xs} / 1.5) ${theme.spacing.sm}`,
            minWidth: '40px',
            minHeight: '40px',
            height: 'auto',
            '& svg': { // Styles for SVGs inside the control buttons
              width: '20px',
              height: '20px',
            },
          },
          // Styles for the root of RichTextEditor.Content
          content: {
            minHeight: `calc(100vh - 320px)`, // Adjust as needed

            // Nest selectors for children of the content area
            '& .ProseMirror': { // Target the Tiptap editor itself
              padding: theme.spacing.md,

              // Styles for unmodifiable headers within ProseMirror
              '& [data-unmodifiable-header="true"]': {
                // Base styles are in tiptapExtensions.ts renderHTML
                // Add overrides or editor-specific visual cues here if needed
                // e.g., userSelect: 'text', // Allow selecting text of unmodifiable headers
              },

              // Styles for editable headers within ProseMirror
              '& [data-editable-header="true"]': {
                // Base styles are in tiptapExtensions.ts renderHTML
                // Placeholder styling for editableHeader is handled by the general '.is-editor-empty:first-child::before'
                // if the Placeholder extension correctly adds the class to the header node itself.
              },

              // General placeholder for any node that Tiptap marks as empty and provides a data-placeholder attribute.
              // This should cover empty paragraphs and potentially empty editableHeaders if configured correctly.
              '& .is-editor-empty:first-child::before': {
                content: 'attr(data-placeholder)',
                float: 'left', // Required for Tiptap's default placeholder styling
                color: theme.colors.gray[6], // Slightly darker for better visibility
                pointerEvents: 'none', // Important to allow clicking "through" the placeholder
                height: 0, // Required for Tiptap's default placeholder styling
                fontStyle: 'italic', // Make placeholder text italic
                // Example of adding some opacity:
                // opacity: 0.8,
              },
            },
            // General placeholder for the entire editor when it's empty
            // This applies to the .ProseMirror element itself when it has the class 'is-editor-empty'
            '& .ProseMirror.is-editor-empty:first-child::before': {
              content: 'attr(data-placeholder)',
              position: 'absolute', // Position it within the ProseMirror container
              left: theme.spacing.md, // Align with padding
              top: theme.spacing.md, // Align with padding
              color: theme.colors.gray[6], // Slightly darker for better visibility
              pointerEvents: 'none',
              fontStyle: 'italic', // Make placeholder text italic
            },
          },
        })}
      >
        <RichTextEditor.Toolbar sticky stickyOffset={60}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Strikethrough />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>

          {/* Custom Controls Group for Copy Markdown and Suggest Changes - Aligned to the right */}
          <RichTextEditor.ControlsGroup style={{ marginLeft: 'auto' }}>
            <Tooltip label="Copy content as Markdown" withArrow>
              <Button
                variant="outline"
                onClick={internalHandleCopyAsMarkdown}
                disabled={!editor}
                size="xs" // Match typical toolbar button sizes
                leftSection={<IconMarkdown size={16} />}
              >
                Copy Markdown
              </Button>
            </Tooltip>
            <Tooltip label="Submit your suggested changes" withArrow>
              <Button
                onClick={internalHandleSuggestChanges}
                disabled={!editor}
                size="xs" // Match typical toolbar button sizes
                leftSection={<IconDeviceFloppy size={16} />}
              >
                Suggest Changes
              </Button>
            </Tooltip>
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>

      {/* Debugging Box ... */}
    </Stack>
  );
});

export default CurriculumEditor;