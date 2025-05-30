// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from './tiptapExtensions';
import { type Course } from '../../types';
import { courseToTiptapJson, COURSE_HEADER_SECTION_ID } from './courseSerializer';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { Button, Stack, Tooltip, type MantineTheme } from '@mantine/core'; // Removed Alert and useMantineThemeCore
import { IconDeviceFloppy, IconClipboardText, IconCheck, IconAlertTriangle } from '@tabler/icons-react'; // IconAlertTriangle might still be useful for notification
import { notifications } from '@mantine/notifications';

export interface CurriculumEditorRef {
  scrollToSection: (sectionId: string) => void;
}

interface CurriculumEditorProps {
  initialCourseData: Course;
  onSave: (editorContent: JSONContent) => Promise<void>;
  courseId: string; // Retained for keying or other potential uses
  isApprovedCourse: boolean;
  isSuggestion: boolean;
}

const CurriculumEditor = forwardRef<CurriculumEditorRef, CurriculumEditorProps>(
  ({ initialCourseData, onSave, courseId, isApprovedCourse, isSuggestion }, ref) => {
    // const theme = useMantineThemeCore(); // No longer needed here if Alert is removed

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
                icon: <IconAlertTriangle size={18} />,
            });
        }

        // Show a notification if editing a suggestion
        if (isSuggestion) {
          notifications.show({
            id: `suggestion-notice-${courseId}`, // Unique ID to prevent multiple similar notifications
            title: 'Editing Suggestion',
            message: `You are editing a suggestion for version ${initialCourseData.version || 'N/A'}. Changes will update this suggestion and require admin approval.`,
            color: 'orange',
            icon: <IconAlertTriangle size={18} />,
            autoClose: 7000, // Give user some time to read
          });
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCourseData, editor, isSuggestion]); // courseId added to deps for notification ID


    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => {
        if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom || !editor.view.dom.parentElement) {
          console.warn("[CurriculumEditor] scrollToSection: Editor or scroll parent not ready.");
          return;
        }
        const scrollableContainer = editor.view.dom.parentElement as HTMLElement;

        if (sectionId === COURSE_HEADER_SECTION_ID) {
          scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const targetElement = editor.view.dom.querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`) as HTMLElement | null;
        
        if (targetElement) {
          const scrollableContainerRect = scrollableContainer.getBoundingClientRect();
          const targetElementRect = targetElement.getBoundingClientRect();
          const scrollTopOffset = targetElementRect.top - scrollableContainerRect.top;
          const newScrollTop = scrollableContainer.scrollTop + scrollTopOffset;
          scrollableContainer.scrollTo({
            top: newScrollTop - 10, 
            behavior: 'smooth',
          });
        } else {
          console.warn(`[CurriculumEditor] scrollToSection: Element with data-section-id="${sectionId}" not found. Scrolling to top.`);
          scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
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
        // Error notification is handled by the caller (App.tsx)
        console.error('Submission failed in editor: ', err);
      }
    };

    if (!editor) {
      return <div>Loading editor...</div>;
    }

    const saveButtonText = isApprovedCourse ? "Suggest Changes" : "Save Suggestion";
    const saveButtonTooltip = isApprovedCourse 
        ? "Submit these edits as a new suggestion for this approved course."
        : "Save the changes to this current suggestion.";

    const HEADER_HEIGHT_FOR_STICKY = 60; 

    return (
      <Stack style={{ height: '100%', overflow: 'hidden' }} gap={0}>
        {/* Alert component removed */}
        <RichTextEditor
          editor={editor}
          style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          styles={(editorTheme: MantineTheme) => ({ 
            root: {
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            },
            content: {
              flexGrow: 1,
              overflowY: 'auto',
              padding: 0, 
              '& > div[style*="overflow"]': { 
                height: '100% !important',
              },
              '& .ProseMirror': { 
                padding: editorTheme.spacing.md,
                minHeight: '100%', 
              },
            },
          })}
        >
          <RichTextEditor.Toolbar 
            sticky 
            stickyOffset={HEADER_HEIGHT_FOR_STICKY} 
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
          <RichTextEditor.Content 
             style={{flexGrow: 1, overflowY: 'auto'}}
          /> 
        </RichTextEditor>
      </Stack>
    );
  }
);

CurriculumEditor.displayName = 'CurriculumEditor';
export default CurriculumEditor;