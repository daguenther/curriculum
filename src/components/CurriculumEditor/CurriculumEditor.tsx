// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from './tiptapExtensions';
import { type Course } from '../../types';
import { courseToTiptapJson, COURSE_HEADER_SECTION_ID } from './courseSerializer';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { Button, Stack, Tooltip, type MantineTheme } from '@mantine/core';
import { IconDeviceFloppy, IconClipboardText, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export interface CurriculumEditorRef {
  scrollToSection: (sectionId: string) => void;
}

interface CurriculumEditorProps {
  initialCourseData: Course;
  onSave: (editorContent: JSONContent) => Promise<void>;
  courseId: string;
  isApprovedCourse: boolean;
  isSuggestion: boolean;
}

const CurriculumEditor = forwardRef<CurriculumEditorRef, CurriculumEditorProps>(
  ({ initialCourseData, onSave, courseId, isApprovedCourse, isSuggestion }, ref) => {
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
            console.error("[DEBUG CurriculumEditor] Error setting Tiptap content:", error, "Problematic JSON:", tiptapJson);
            editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] }, false);
            notifications.show({
                title: 'Content Load Error',
                message: 'There was an issue loading parts of the course content.',
                color: 'orange',
                icon: <IconAlertTriangle size={18} />,
            });
        }

        if (isSuggestion) {
          notifications.show({
            id: `suggestion-notice-${courseId}`,
            title: 'Editing Suggestion',
            message: `You are editing a suggestion for version ${initialCourseData.version || 'N/A'}. Changes will update this suggestion and require admin approval.`,
            color: 'orange',
            icon: <IconAlertTriangle size={18} />,
            autoClose: 7000,
          });
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCourseData, editor, isSuggestion, courseId]);


    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => {
        if (!editor || editor.isDestroyed) {
          console.warn("[CurriculumEditor] Editor not ready or destroyed.");
          return;
        }
        
        const scrollableContainer = editor.view.dom.parentElement as HTMLElement | null;
        
        if (!scrollableContainer || !scrollableContainer.classList.contains('mantine-RichTextEditor-content')) {
            console.warn("[CurriculumEditor] Scrollable container (.mantine-RichTextEditor-content) not found correctly. Attempting fallback or logging.", editor.view.dom.parentElement);
            if (!editor.view.dom.parentElement) {
                console.warn("[CurriculumEditor] Editor view DOM has no parentElement.");
                return;
            }
        }
        
        if (sectionId === COURSE_HEADER_SECTION_ID) {
          scrollableContainer?.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const selector = `[data-section-id="${CSS.escape(sectionId)}"]`;
        const targetElement = editor.view.dom.querySelector(selector) as HTMLElement | null;
        
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          console.warn(`[CurriculumEditor] Element with data-section-id="${sectionId}" not found. Scrolling to top of scrollable container as a fallback.`);
          scrollableContainer?.scrollTo({ top: 0, behavior: 'smooth' });
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
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([textContent], { type: 'text/plain' });
        const clipboardItem = new ClipboardItem({'text/html': htmlBlob, 'text/plain': textBlob});
        await navigator.clipboard.write([clipboardItem]);
        notifications.show({
          title: 'Copied as Rich Text!',
          message: 'Content copied. You can now paste it into Google Docs or other editors.',
          color: 'green', icon: <IconCheck size={18} />,
        });
      } catch (err) {
        console.error('Failed to copy as Rich Text: ', err);
        notifications.show({
          title: 'Copy Failed', message: 'Could not copy content as Rich Text.', color: 'red'
        });
      }
    };

    const internalHandleSubmitChanges = async () => {
      if (!editor) return;
      const editorJson = editor.getJSON();
      try {
        await onSaveRef.current(editorJson);
      } catch (err) {
        // Error already handled by onSave and shown via notifications in App.tsx
        // console.error('Submission failed in editor: ', err); // Kept for debugging if needed
      }
    };

    if (!editor) {
      return <div>Loading editor...</div>;
    }

    const saveButtonText = isApprovedCourse ? "Suggest Changes" : "Save Suggestion";
    const saveButtonTooltip = isApprovedCourse
        ? "Submit these edits as a new suggestion for this approved course."
        : "Save the changes to this current suggestion.";

    return (
      <Stack style={{ height: '100%', width: '100%', minHeight: 0 }} gap={0}>
        <RichTextEditor
          editor={editor}
          style={{ 
            flexGrow: 1, // Make RichTextEditor take available space in Stack
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: 0, // Essential for flex children that need to scroll
            // Removed height: '100%' here, flexGrow: 1 with minHeight: 0 is preferred for flex children
          }}
          styles={(editorTheme: MantineTheme) => ({
            root: { // Styles for the RichTextEditor's outermost div
                display: 'flex',
                flexDirection: 'column',
                height: '100%', // Ensures the root element fills the space allocated by the style prop above
                minHeight: 0,    // Added for safety in flex context
            },
            toolbar: { 
              flexShrink: 0, 
              zIndex: 50, 
              backgroundColor: editorTheme.colorScheme === 'dark' ? editorTheme.colors.dark[7] : editorTheme.white,
            },
            content: { // Styles for the div that WRAPS <RichTextEditor.Content /> (the scrollable area)
              flexGrow: 1, 
              flexBasis: '0%', 
              overflowY: 'auto', // THIS ENABLES SCROLLING FOR THE CONTENT AREA
              minHeight: 0,      // Added to ensure it can shrink if needed by flexbox calculations
              '& .ProseMirror': { // Styles for the actual TipTap editor instance
                padding: editorTheme.spacing.md,
                // REMOVED minHeight: '100%'. ProseMirror should grow naturally with its content.
                // Its container (this 'content' div) is what scrolls.
              },
            },
          })}
        >
          <RichTextEditor.Toolbar
            sticky 
            stickyOffset={0} 
          >
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold /> <RichTextEditor.Italic /> <RichTextEditor.Underline /> <RichTextEditor.Strikethrough />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList /> <RichTextEditor.OrderedList />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link /> <RichTextEditor.Unlink />
            </RichTextEditor.ControlsGroup>
            <RichTextEditor.ControlsGroup style={{ marginLeft: 'auto' }}>
              <Tooltip label="Copy content as Rich Text (for Google Docs, etc.)" withArrow>
                <Button
                  variant="default"
                  onClick={internalHandleCopyAsRichText}
                  disabled={!editor || editor.isEmpty}
                  size="xs"
                  leftSection={<IconClipboardText size={16} />}
                >
                  Copy Rich Text
                </Button>
              </Tooltip>
              <Tooltip label={saveButtonTooltip} withArrow>
                <Button
                  onClick={internalHandleSubmitChanges}
                  disabled={!editor}
                  size="xs"
                  leftSection={<IconDeviceFloppy size={16} />}
                >
                  {saveButtonText}
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