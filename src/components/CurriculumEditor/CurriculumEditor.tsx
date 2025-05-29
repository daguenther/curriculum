// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from './tiptapExtensions'; // Ensure custom nodes are in here
import { type Course } from '../../types';
import { courseToTiptapJson, COURSE_HEADER_SECTION_ID } from './courseSerializer';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { Button, Stack, Tooltip, type MantineTheme } from '@mantine/core';
import { IconDeviceFloppy, IconMarkdown, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { tiptapJsonToMarkdown } from '../../utils/tiptapToMarkdown'; // Assuming this utility exists

export interface CurriculumEditorRef {
  scrollToSection: (sectionId: string) => void;
}

interface CurriculumEditorProps {
  initialCourseData: Course;
  onSave: (editorContent: JSONContent) => Promise<void>;
  courseId: string; // Though not directly used in this file's logic, it's a common prop
}

const CurriculumEditor = forwardRef<CurriculumEditorRef, CurriculumEditorProps>(
  ({ initialCourseData, onSave /*, courseId */ }, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
      extensions: editorExtensions, // This MUST include your 'editableHeader' and 'unmodifiableHeader' nodes
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
        // console.log('Generated Tiptap JSON for setContent:', JSON.stringify(tiptapJson, null, 2));
        try {
          editor.commands.setContent(tiptapJson, false);
        } catch (error) {
            console.error("Error setting Tiptap content:", error, "Problematic JSON:", tiptapJson);
            editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] }, false);
            notifications.show({
                title: 'Content Load Error',
                message: 'There was an issue loading parts of the course content.',
                color: 'orange',
            });
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCourseData, editor]);

    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => {
        // console.log(`[CurriculumEditor] Attempting to scroll to section: ${sectionId}`);
        if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) {
          console.warn("[CurriculumEditor] scrollToSection: Editor not ready.");
          return;
        }

        const scrollableView = editor.view.dom.closest('.mantine-RichTextEditor-content') as HTMLElement | null;

        if (!scrollableView) {
          console.warn("[CurriculumEditor] scrollToSection: Scrollable container (.mantine-RichTextEditor-content) not found.");
          return;
        }
        // console.log("[CurriculumEditor] Scrollable view identified:", scrollableView);

        if (sectionId === COURSE_HEADER_SECTION_ID) {
          // console.log(`[CurriculumEditor] Scrolling ${scrollableView.className} to top for ${COURSE_HEADER_SECTION_ID}`);
          scrollableView.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const proseMirrorElement = scrollableView.querySelector('.ProseMirror') as HTMLElement | null;
        if (!proseMirrorElement) {
          console.warn("[CurriculumEditor] scrollToSection: ProseMirror element not found. Cannot scroll to specific unit.");
          scrollableView.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // IMPORTANT: This relies on your custom 'editableHeader' node (or its wrapper)
        // rendering an HTML 'id' attribute with the value of `sectionId`.
        const targetElement = proseMirrorElement.querySelector(`#${CSS.escape(sectionId)}`) as HTMLElement | null;

        if (targetElement) {
          // console.log(`[CurriculumEditor] Target element #${sectionId} found:`, targetElement);
          const scrollableViewRect = scrollableView.getBoundingClientRect();
          const targetElementRect = targetElement.getBoundingClientRect();
          const scrollTopOffset = targetElementRect.top - scrollableViewRect.top;
          const newScrollTop = scrollableView.scrollTop + scrollTopOffset;

          scrollableView.scrollTo({
            top: newScrollTop,
            behavior: 'smooth',
          });
          // console.log(`[CurriculumEditor] Scrolling ${scrollableView.className} to ${newScrollTop}px for element #${sectionId}`);
        } else {
          console.warn(`[CurriculumEditor] scrollToSection: Element with ID "${sectionId}" not found within ProseMirror. Scrolling to top.`);
          // console.log('Available IDs in ProseMirror:', Array.from(proseMirrorElement.querySelectorAll('[id]')).map(el => el.id));
          scrollableView.scrollTo({ top: 0, behavior: 'smooth' });
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
      return <div>Loading editor...</div>;
    }

    return (
      <Stack>
        <RichTextEditor
          editor={editor}
          styles={(theme: MantineTheme) => ({
            // toolbar: {}, // Default or your custom styles
            // control: { /* ... */ }, // Default or your custom styles
            content: { // This is the scrollable area we target
              minHeight: `calc(100vh - 300px)`, // Adjust as needed based on header/toolbar height
              maxHeight: `calc(100vh - 200px)`, // Example: provide a max height
              overflowY: 'auto', // Ensure it's scrollable
              '& .ProseMirror': {
                padding: theme.spacing.md,
                // Your existing styles for ProseMirror content
              },
            },
          })}
        >
          <RichTextEditor.Toolbar sticky stickyOffset={60}> {/* AppShell header height */}
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
                  variant="default"
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
          {/* This renders the .mantine-RichTextEditor-content and .ProseMirror elements */}
          <RichTextEditor.Content />
        </RichTextEditor>
      </Stack>
    );
  }
);

CurriculumEditor.displayName = 'CurriculumEditor';

export default CurriculumEditor;