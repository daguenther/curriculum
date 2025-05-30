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
      // console.log('[DEBUG CurriculumEditor] initialCourseData/editor effect triggered.'); // Keep logs if needed
      if (initialCourseData && editor && !editor.isDestroyed) {
        // console.log('[DEBUG CurriculumEditor] Setting content. initialCourseData.title:', initialCourseData.title);
        const tiptapJson = courseToTiptapJson(initialCourseData);
        try {
          editor.commands.setContent(tiptapJson, false);
          // console.log('[DEBUG CurriculumEditor] Content set successfully.');
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
      } else {
        // console.log('[DEBUG CurriculumEditor] Skipping setContent. Conditions not met:', 
        //   { hasInitialData: !!initialCourseData, editorExists: !!editor, editorIsNotDestroyed: editor && !editor.isDestroyed }
        // );
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCourseData, editor, isSuggestion, courseId]);


    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => {
        console.log(`[CurriculumEditor] scrollToSection called with sectionId: ${sectionId}`);

        if (!editor || editor.isDestroyed) {
          console.warn("[CurriculumEditor] Editor not ready or destroyed.");
          return;
        }
        if (!editor.view || !editor.view.dom) {
          console.warn("[CurriculumEditor] Editor view or DOM not ready.");
          return;
        }

        let scrollableContainer = editor.view.dom.closest('.mantine-RichTextEditor-content') as HTMLElement | null;
        console.log('[CurriculumEditor] Initial scrollableContainer:', scrollableContainer);

        if (!scrollableContainer) {
          console.warn("[CurriculumEditor] '.mantine-RichTextEditor-content' not found. Falling back to editor.view.dom.parentElement.");
          scrollableContainer = editor.view.dom.parentElement as HTMLElement | null;
          console.log('[CurriculumEditor] Fallback scrollableContainer:', scrollableContainer);
          if (!scrollableContainer) {
            console.warn("[CurriculumEditor] Fallback scroll container also not found. Cannot scroll.");
            return;
          }
        }
        
        console.log(`[CurriculumEditor] scrollableContainer details: scrollHeight: ${scrollableContainer.scrollHeight}, clientHeight: ${scrollableContainer.clientHeight}, scrollTop: ${scrollableContainer.scrollTop}`);

        if (sectionId === COURSE_HEADER_SECTION_ID) {
          console.log('[CurriculumEditor] Scrolling to top for COURSE_HEADER_SECTION_ID.');
          scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const selector = `[data-section-id="${CSS.escape(sectionId)}"]`;
        const targetElement = editor.view.dom.querySelector(selector) as HTMLElement | null;
        console.log(`[CurriculumEditor] Attempting to find targetElement with selector: ${selector}`, targetElement);
        
        if (targetElement) {
          console.log('[CurriculumEditor] Target element found. Attempting scrollIntoView first.');
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Fallback logic if scrollIntoView is not sufficient (e.g. if it doesn't work in all cases)
          // For now, we will trust scrollIntoView and not implement the more complex fallback.
          // If issues arise, the following commented-out block can be revisited.
          /*
          if (scrollableContainer) {
            const scrollableContainerRect = scrollableContainer.getBoundingClientRect();
            const targetElementRect = targetElement.getBoundingClientRect();

            // Check if the element is already in view after scrollIntoView
            // This check might be overly simplistic and might need refinement
            if (targetElementRect.top < scrollableContainerRect.top || targetElementRect.bottom > scrollableContainerRect.bottom) {
              console.log('[CurriculumEditor] scrollIntoView might not have been sufficient, attempting manual scroll. This path should ideally not be hit frequently.');
              const offsetTopInScroller = targetElementRect.top - scrollableContainerRect.top;
              const newScrollTop = scrollableContainer.scrollTop + offsetTopInScroller;
              // Removed the -10 offset as per requirements
              const finalScrollTo = newScrollTop;
              console.log(`[CurriculumEditor] Manual scroll fallback: scrollableContainerRect.top=${scrollableContainerRect.top}, targetElementRect.top=${targetElementRect.top}, offsetTopInScroller=${offsetTopInScroller}, currentScrollTop=${scrollableContainer.scrollTop}, newScrollTop=${newScrollTop}, finalScrollTo=${finalScrollTo}`);

              scrollableContainer.scrollTo({
                top: finalScrollTo,
                behavior: 'smooth',
              });
            } else {
              console.log('[CurriculumEditor] Target element likely already in view after scrollIntoView.');
            }
          }
          */
        } else {
          console.warn(`[CurriculumEditor] Element with data-section-id="${sectionId}" not found. Scrolling to top of scrollable container as a fallback.`);
          if (scrollableContainer) {
            scrollableContainer.scrollTo({ top: 0, behavior: 'smooth' });
          }
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
      <Stack style={{ height: '100%' }} gap={0}> {/* Removed overflow: 'hidden' */}
        <RichTextEditor
          editor={editor}
          // Added minHeight:0 here if needed, but App.tsx Box is more primary
          style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }} // Removed overflow: 'hidden'
          styles={(editorTheme: MantineTheme) => ({
            root: {
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                // minHeight: 0, // Added here if needed, but App.tsx Box is more primary
            },
            content: { 
              flexGrow: 1, 
              flexShrink: 1, 
              flexBasis: '0%', // Important for flex-grow to work correctly
              overflowY: 'auto', 
              padding: 0,
              // Removed backgroundColor: 'rgba(255, 0, 0, 0.1)'
              '& .ProseMirror': { 
                padding: editorTheme.spacing.md,
                // Ensure no height: 100% or min-height: 100% here
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
          <RichTextEditor.Content />
        </RichTextEditor>
      </Stack>
    );
  }
);

CurriculumEditor.displayName = 'CurriculumEditor';
export default CurriculumEditor;