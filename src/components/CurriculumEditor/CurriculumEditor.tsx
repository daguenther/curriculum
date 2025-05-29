// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from './tiptapExtensions';
import { type Course } from '../../types';
import { courseToTiptapJson } from './courseSerializer';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { Button, Paper, Group, Stack, Title, Box, Tooltip, type MantineTheme } from '@mantine/core';
import { IconDeviceFloppy, IconMarkdown, IconCheck } from '@tabler/icons-react'; // IconPlus removed as not used here
import { notifications } from '@mantine/notifications';
import { tiptapJsonToMarkdown } from '../../utils/tiptapToMarkdown';

// Define the interface for the methods exposed by the editor via ref
export interface CurriculumEditorRef {
  scrollToSection: (sectionId: string) => void;
  // Add other methods you might want to call from the parent if necessary
}

interface CurriculumEditorProps {
  initialCourseData: Course;
  onSave: (editorContent: JSONContent) => Promise<void>;
  courseId: string;
}

const CurriculumEditor = forwardRef<CurriculumEditorRef, CurriculumEditorProps>(
  ({ initialCourseData, onSave, courseId }, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
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

    // Expose specific methods to the parent component via ref
    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => {
        if (!editor || editor.isDestroyed) return;
        // This is a basic implementation. It assumes your Tiptap content renders
        // elements with `id` attributes matching `sectionId`.
        // You might need a more robust way to find and scroll to Tiptap nodes.
        try {
            const contentArea = editor.view.dom.closest('.mantine-RichTextEditor-content') || editor.view.dom.parentElement;
            if (contentArea) {
                const targetElement = contentArea.querySelector(`#${CSS.escape(sectionId)}`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    console.warn(`[CurriculumEditor] scrollToSection: Element with ID "${sectionId}" not found.`);
                    // Fallback: scroll the editor's parent scroll container to the top
                    if (contentArea.scrollTop !== undefined) contentArea.scrollTop = 0;
                }
            }
        } catch (e) {
            console.error("Error scrolling to section:", e);
        }
      },
    }));

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
      // This command needs to be implemented as a Tiptap extension if it's custom
      if (editor && (editor.commands as any).addUnit) { // Cast to any if addUnit is a custom command
        editor.chain().focus().addUnit().run();
      } else {
        console.error("addUnit command not available on editor.");
        notifications.show({ title: 'Error', message: 'Cannot add unit. Command not available.', color: 'red' });
      }
    };

    // FIX: Define internalHandleSuggestChanges
    const internalHandleSuggestChanges = async () => {
      if (!editor) return;
      const editorJson = editor.getJSON();
      try {
        // Use the onSaveRef to call the onSave prop passed from App.tsx
        await onSaveRef.current(editorJson);
        // Notification for success can be shown here or in App.tsx's onSave handler
        notifications.show({
          title: 'Changes Submitted!', // Or "Suggested" to match button
          message: 'Your updates have been sent for review.',
          color: 'green',
          icon: <IconCheck size={18} />,
        });
      } catch (err) {
        console.error('Failed to submit changes: ', err);
        notifications.show({
          title: 'Submission Failed',
          message: 'Could not submit your changes.',
          color: 'red',
        });
      }
    };

    if (!editor) {
      return <div>Loading editor...</div>;
    }

    return (
      <Stack>
        <RichTextEditor
          editor={editor}
          styles={(theme: MantineTheme) => ({
            toolbar: {},
            control: {
              padding: `calc(${theme.spacing.xs} / 1.5) ${theme.spacing.sm}`,
              minWidth: '40px',
              minHeight: '40px',
              height: 'auto',
              '& svg': {
                width: '20px',
                height: '20px',
              },
            },
            content: {
              minHeight: `calc(100vh - 320px)`,
              '& .ProseMirror': {
                padding: theme.spacing.md,
                '& [data-unmodifiable-header="true"]': {},
                '& [data-editable-header="true"]': {},
                '& .is-editor-empty:first-child::before': {
                  content: 'attr(data-placeholder)',
                  float: 'left',
                  color: theme.colors.gray[6],
                  pointerEvents: 'none',
                  height: 0,
                  fontStyle: 'italic',
                },
              },
              '& .ProseMirror.is-editor-empty:first-child::before': {
                content: 'attr(data-placeholder)',
                position: 'absolute',
                left: theme.spacing.md,
                top: theme.spacing.md,
                color: theme.colors.gray[6],
                pointerEvents: 'none',
                fontStyle: 'italic',
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
            <RichTextEditor.ControlsGroup style={{ marginLeft: 'auto' }}>
              <Tooltip label="Copy content as Markdown" withArrow>
                <Button
                  variant="outline"
                  onClick={internalHandleCopyAsMarkdown}
                  disabled={!editor}
                  size="xs"
                  leftSection={<IconMarkdown size={16} />}
                >
                  Copy Markdown
                </Button>
              </Tooltip>
              <Tooltip label="Submit your suggested changes" withArrow>
                <Button
                  onClick={internalHandleSuggestChanges} // This will now call the defined function
                  disabled={!editor}
                  size="xs"
                  leftSection={<IconDeviceFloppy size={16} />}
                >
                  Suggest Changes
                </Button>
              </Tooltip>
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>
          <RichTextEditor.Content />
        </RichTextEditor>
      </Stack>
    );
  }
);

CurriculumEditor.displayName = 'CurriculumEditor'; // For better debugging with React DevTools

export default CurriculumEditor;