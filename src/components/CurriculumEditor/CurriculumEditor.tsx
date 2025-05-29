// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from './tiptapExtensions'; // Ensure Placeholder extension is configured here
import { type Course } from '../../types';
import { courseToTiptapJson } from './courseSerializer';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { Button, Stack, Tooltip, type MantineTheme } from '@mantine/core';
import { IconDeviceFloppy, IconMarkdown, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { tiptapJsonToMarkdown } from '../../utils/tiptapToMarkdown';

export interface CurriculumEditorRef {
  scrollToSection: (sectionId: string) => void;
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
      extensions: editorExtensions, // Ensure Placeholder extension is configured here
      content: '', // Initial content set by useEffect
      editable: true,
    });

    const onSaveRef = useRef(onSave);
    useEffect(() => {
      onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
      if (initialCourseData && editor && !editor.isDestroyed) {
        // CRITICAL: The 'Invalid content... Empty text nodes' error
        // originates from courseToTiptapJson.
        // It must not produce nodes like { "type": "text", "text": "" }.
        // It needs to correctly handle EMPTY_ARRAY_JSON_STRING and empty strings
        // to produce valid Tiptap JSON (e.g., an empty paragraph { "type": "paragraph" }).
        const tiptapJson = courseToTiptapJson(initialCourseData);

        // For debugging the Tiptap content error:
        // console.log('Initial Course Data:', JSON.stringify(initialCourseData, null, 2));
        // console.log('Generated Tiptap JSON for setContent:', JSON.stringify(tiptapJson, null, 2));

        try {
          editor.commands.setContent(tiptapJson, false);
        } catch (error) {
            console.error("Error setting Tiptap content:", error, "Problematic JSON:", tiptapJson);
            // Fallback to a safe empty state if content is truly broken
            editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] }, false);
            notifications.show({
                title: 'Content Load Error',
                message: 'There was an issue loading parts of the course content. Some content may appear empty.',
                color: 'orange',
            });
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCourseData, editor]); // editor dependency is important for re-initialization

    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => {
        if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) {
          console.warn("[CurriculumEditor] scrollToSection called but editor or its view is not ready.");
          return;
        }
        try {
            const editorElement = editor.view.dom;
            const scrollableView = editorElement.closest('.mantine-RichTextEditor-content') || editorElement.parentElement || document.documentElement;

            if (scrollableView) {
                const targetElement = scrollableView.querySelector(`#${CSS.escape(sectionId)}`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    console.warn(`[CurriculumEditor] scrollToSection: Element with ID "${sectionId}" not found in editor content.`);
                    if (scrollableView && typeof (scrollableView as HTMLElement).scrollTop === 'number') {
                      (scrollableView as HTMLElement).scrollTop = 0;
                    }
                }
            } else {
                 console.warn("[CurriculumEditor] scrollToSection: Could not find scrollable view container.");
            }
        } catch (e) {
            console.error("[CurriculumEditor] Error scrolling to section:", e);
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

    const internalHandleSuggestChanges = async () => {
      if (!editor) return;
      const editorJson = editor.getJSON();
      try {
        await onSaveRef.current(editorJson);
        notifications.show({
          title: 'Changes Submitted!',
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
      // This should ideally not be shown long if `immediatelyRender: false`
      // and useEffect populates content.
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
              minHeight: `calc(100vh - 380px)`,
              '& .ProseMirror': {
                padding: theme.spacing.md,
                // Ensure these data attributes are actually being set by your custom nodes/logic
                '& [data-unmodifiable-header="true"]': {
                  /* styles for unmodifiable headers */
                  // Example: backgroundColor: theme.colors.gray[1], cursor: 'not-allowed'
                },
                '& [data-editable-header="true"]': {
                  /* styles for editable headers */
                },
                // Rely on Tiptap's Placeholder extension for placeholder styling.
                // If you need to override its styles, target the classes it adds.
                // Example:
                // '& .is-empty::before': {
                //   content: 'attr(data-placeholder)',
                //   float: 'left',
                //   color: theme.colors.gray[5],
                //   pointerEvents: 'none',
                //   height: 0,
                // },
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
                  variant="default" // "outline" is also good
                  onClick={internalHandleCopyAsMarkdown}
                  disabled={!editor || editor.isEmpty}
                  size="xs"
                  leftSection={<IconMarkdown size={16} />}
                >
                  Copy Markdown
                </Button>
              </Tooltip>
              <Tooltip label="Submit your suggested changes" withArrow>
                <Button
                  onClick={internalHandleSuggestChanges}
                  disabled={!editor || editor.isEmpty}
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

CurriculumEditor.displayName = 'CurriculumEditor';

export default CurriculumEditor;