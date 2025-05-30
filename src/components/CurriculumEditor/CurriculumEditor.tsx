// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from './tiptapExtensions';
import { type Course } from '../../types';
import { courseToTiptapJson, COURSE_HEADER_SECTION_ID } from './courseSerializer';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { Button, Stack, Tooltip, type MantineTheme } from '@mantine/core';
import { IconDeviceFloppy, IconClipboardText, IconCheck } from '@tabler/icons-react'; // Changed IconMarkdown to IconClipboardText
import { notifications } from '@mantine/notifications';
// tiptapJsonToMarkdown is no longer used by this component for copying
// import { tiptapJsonToMarkdown } from '../../utils/tiptapToMarkdown';

export interface CurriculumEditorRef {
  scrollToSection: (sectionId: string) => void;
}

interface CurriculumEditorProps {
  initialCourseData: Course;
  onSave: (editorContent: JSONContent) => Promise<void>;
  courseId: string;
}

const CurriculumEditor = forwardRef<CurriculumEditorRef, CurriculumEditorProps>(
  ({ initialCourseData, onSave }, ref) => {
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
        if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) {
          return;
        }
        const scrollableView = editor.view.dom.closest('.mantine-RichTextEditor-content') as HTMLElement | null;
        if (!scrollableView) return;

        if (sectionId === COURSE_HEADER_SECTION_ID) {
          scrollableView.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const proseMirrorElement = scrollableView.querySelector('.ProseMirror') as HTMLElement | null;
        if (!proseMirrorElement) {
          scrollableView.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const targetElement = proseMirrorElement.querySelector(`#${CSS.escape(sectionId)}`) as HTMLElement | null;
        if (targetElement) {
          const scrollableViewRect = scrollableView.getBoundingClientRect();
          const targetElementRect = targetElement.getBoundingClientRect();
          const scrollTopOffset = targetElementRect.top - scrollableViewRect.top;
          const newScrollTop = scrollableView.scrollTop + scrollTopOffset;
          scrollableView.scrollTo({ top: newScrollTop, behavior: 'smooth' });
        } else {
          scrollableView.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
    }));

    const internalHandleCopyAsRichText = async () => {
      if (!editor) return;
      try {
        const htmlContent = editor.getHTML();
        const textContent = editor.getText();

        if (!htmlContent.trim() && !textContent.trim()) {
          notifications.show({ title: 'Nothing to Copy', message: 'The content is empty.', color: 'yellow' });
          return;
        }

        // The Clipboard API requires data to be in a Blob for text/html
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([textContent], { type: 'text/plain' });

        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });

        await navigator.clipboard.write([clipboardItem]);
        notifications.show({
          title: 'Copied as Rich Text!',
          message: 'Content copied. You can now paste it into Google Docs or other editors.',
          color: 'green',
          icon: <IconCheck size={18} />,
        });
      } catch (err) {
        console.error('Failed to copy as Rich Text: ', err);
        notifications.show({
          title: 'Copy Failed',
          message: 'Could not copy content as Rich Text. Your browser might not support this feature or there was an unexpected error.',
          color: 'red'
        });
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
            content: {
              minHeight: `calc(100vh - 300px)`,
              maxHeight: `calc(100vh - 200px)`,
              overflowY: 'auto',
              '& .ProseMirror': {
                padding: theme.spacing.md,
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
              <Tooltip label="Copy content as Rich Text (for Google Docs, etc.)" withArrow>
                <Button
                  variant="default"
                  onClick={internalHandleCopyAsRichText} // Changed function
                  disabled={!editor || editor.isEmpty}
                  size="xs"
                  leftSection={<IconClipboardText size={16} />} // Changed icon
                >
                  Copy Rich Text {/* Changed label */}
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