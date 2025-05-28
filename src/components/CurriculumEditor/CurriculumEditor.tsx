// src/components/CurriculumEditor/CurriculumEditor.tsx
import React, { useEffect, useRef } from 'react';
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

const CurriculumEditor: React.FC<CurriculumEditorProps> = ({ initialCourseData, onSave, courseId }) => {
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

  const handleSaveClick = () => {
    if (editor) {
      const jsonContent = editor.getJSON();
      onSaveRef.current(jsonContent);
    }
  };

  const handleCopyAsMarkdown = async () => {
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

  const handleAddUnit = () => {
    if (editor && editor.commands.addUnit) {
      editor.chain().focus().addUnit().run();
    } else {
      console.error("addUnit command not available on editor.");
      notifications.show({ title: 'Error', message: 'Cannot add unit. Command not available.', color: 'red' });
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <Stack>
      <Paper p="sm" shadow="xs" withBorder>
        <Group justify="space-between">
          <Title order={4}>Editing: {initialCourseData.title} ({initialCourseData.name})</Title>
          <Group>
            <Tooltip label="Add a new unit to the end" position="bottom" withArrow>
              <Button
                variant="light"
                onClick={handleAddUnit}
                leftSection={<IconPlus size={16} />}
              >
                Add Unit
              </Button>
            </Tooltip>
            <Tooltip label="Copy content as Markdown (includes headers)" position="bottom" withArrow>
              <Button
                variant="outline"
                onClick={handleCopyAsMarkdown}
                leftSection={<IconMarkdown size={16} />}
              >
                Copy Markdown
              </Button>
            </Tooltip>
            <Button onClick={handleSaveClick} leftSection={<IconDeviceFloppy size={16}/>}>
              Save Changes
            </Button>
          </Group>
        </Group>
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
                '& [data-header-label]': {
                  // fontWeight: 'normal', // Already handled in renderHTML to prevent double bolding
                },
                '& [data-header-value]': {
                  // fontWeight: 'normal', // Already handled in renderHTML
                  // Placeholder for the editable value part
                  '& p.is-editor-empty:first-child::before': {
                    content: 'attr(data-placeholder)',
                    float: 'left',
                    color: theme.colors.gray[5],
                    pointerEvents: 'none',
                    height: 0,
                  },
                },
              },

              // General placeholder for empty paragraphs not inside an editable header's value
              // This selector is a bit complex and :has might not be universally supported.
              // A simpler approach might be to style all p.is-editor-empty and rely on Tiptap's
              // placeholder extension logic for which one actually displays.
              // For now, keeping your more specific one, but be aware of :has support.
              '& p.is-editor-empty:not(:has(ancestor::[data-editable-header="true"])):first-child::before': {
                content: 'attr(data-placeholder)',
                float: 'left',
                color: theme.colors.gray[5],
                pointerEvents: 'none',
                height: 0,
              },
            },
             // General placeholder for the entire editor when it's empty
             // This applies to the .ProseMirror element itself when it has the class
            '& .ProseMirror.is-editor-empty:first-child::before': {
                content: 'attr(data-placeholder)',
                position: 'absolute', // Position it within the ProseMirror container
                left: theme.spacing.md, // Align with padding
                top: theme.spacing.md,  // Align with padding
                color: theme.colors.gray[5],
                pointerEvents: 'none',
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
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>

      {/* Debugging Box ... */}
    </Stack>
  );
};

export default CurriculumEditor;