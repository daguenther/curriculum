// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from './tiptapExtensions';
import { type Course } from '../../types';
import { courseToTiptapJson, COURSE_HEADER_SECTION_ID } from './courseSerializer';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { Button, Stack, Tooltip, type MantineTheme, Alert } from '@mantine/core';
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
            console.error("Error setting Tiptap content:", error, "Problematic JSON:", tiptapJson);
            editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] }, false);
            notifications.show({
                title: 'Content Load Error',
                message: 'There was an issue loading parts of the course content.',
                color: 'orange',
            });
        }
      }
    }, [initialCourseData, editor]);


    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => {
        if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) {
          console.warn("[CurriculumEditor] scrollToSection: Editor not ready.");
          return;
        }
        const scrollableContainer = editor.view.dom.closest('.mantine-RichTextEditor-content > div');
        if (!scrollableContainer) {
          console.warn("[CurriculumEditor] scrollToSection: Scrollable container not found.");
          editor.view.dom.parentElement?.scrollTo({ top: 0, behavior: 'smooth'});
          return;
        }
        if (sectionId === COURSE_HEADER_SECTION_ID) {
          scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const proseMirrorRoot = editor.view.dom;
        const targetElement = proseMirrorRoot.querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`) as HTMLElement | null;
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
        console.error('Submission failed in editor: ', err);
        // Error notification is handled in App.tsx after promise rejection
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
      <Stack style={{ height: '100%', overflow: 'hidden' }}>
         {isSuggestion && (
          <Alert icon={<IconAlertTriangle size="1rem" />} title="Editing Suggestion" color="orange" variant="light" m="md" mb={0}>
            You are currently editing a suggestion. Changes saved here will update this suggestion.
            An administrator will need to approve it to make it the main version.
            Original course version: {initialCourseData.version || 'N/A'}.
          </Alert>
        )}
        <RichTextEditor
          editor={editor}
          style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          styles={(theme: MantineTheme) => ({
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
                padding: theme.spacing.md,
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
            {/* THIS IS THE CORRECTED/RESTORED SECTION */}
            <RichTextEditor.ControlsGroup style={{ marginLeft: 'auto' }}>
              <Tooltip label="Copy content as Rich Text (for Google Docs, etc.)" withArrow>
                <Button 
                  variant="default" 
                  onClick={internalHandleCopyAsRichText} // Corrected function name here
                  disabled={!editor || editor.isEmpty} 
                  size="xs" 
                  leftSection={<IconClipboardText size={16} />}
                >
                  Copy Rich Text
                </Button>
              </Tooltip>
              <Tooltip label={saveButtonTooltip} withArrow>
                <Button 
                  onClick={internalHandleSubmitChanges} // Corrected function name here
                  disabled={!editor} // Consider editor.isPristine or !editor.can().undo() for better disabled state
                  size="xs" 
                  leftSection={<IconDeviceFloppy size={16} />}
                >
                  {saveButtonText}
                </Button>
              </Tooltip>
            </RichTextEditor.ControlsGroup>
            {/* END OF CORRECTED/RESTORED SECTION */}
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