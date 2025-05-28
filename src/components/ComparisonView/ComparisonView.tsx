// src/components/ComparisonView/ComparisonView.tsx
import React, { useEffect, useState } from 'react';
import { Grid, Paper, Title, LoadingOverlay, Alert, Box, ScrollArea } from '@mantine/core';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { editorExtensions } from '../CurriculumEditor/tiptapExtensions'; // Re-use extensions
import { type Course } from '../../types';
import { fetchCourseById } from '../../firebase';
import { courseToTiptapJson } from '../CurriculumEditor/courseSerializer';
import { IconAlertCircle } from '@tabler/icons-react';
import '@mantine/tiptap/styles.css'; // Ensure styles are loaded

interface ComparisonViewProps {
  docId1: string | null;
  docId2: string | null;
}

const ReadOnlyTiptapDisplay: React.FC<{ course: Course | null, title: string }> = ({ course, title }) => {
  const editor = useEditor({
    extensions: editorExtensions,
    editable: false, // KEY FOR READ-ONLY
    content: '',
  });

  useEffect(() => {
    if (course && editor && !editor.isDestroyed) {
      const tiptapJson = courseToTiptapJson(course);
      editor.commands.setContent(tiptapJson);
    } else if (!course && editor && !editor.isDestroyed) {
        editor.commands.clearContent();
    }
  }, [course, editor]);

  if (!editor) return <p>Initializing display...</p>;
  if (!course) return <Paper p="md" withBorder style={{minHeight: 200}}><Title order={5} ta="center" c="dimmed">{title}: Not selected</Title></Paper>;

  return (
    <Paper p="md" withBorder style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Title order={4} mb="sm">{title}: {course.title}</Title>
      <ScrollArea style={{ flexGrow: 1, height: 'calc(100vh - 250px)' /* Adjust as needed */ }}>
        <EditorContent editor={editor} className="tiptap-readonly" />
      </ScrollArea>
    </Paper>
  );
};

const ComparisonView: React.FC<ComparisonViewProps> = ({ docId1, docId2 }) => {
  const [course1, setCourse1] = useState<Course | null>(null);
  const [course2, setCourse2] = useState<Course | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);

  useEffect(() => {
    if (docId1) {
      setLoading1(true); setError1(null);
      fetchCourseById(docId1)
        .then(setCourse1)
        .catch(err => { console.error(err); setError1('Failed to load document 1'); })
        .finally(() => setLoading1(false));
    } else {
      setCourse1(null);
    }
  }, [docId1]);

  useEffect(() => {
    if (docId2) {
      setLoading2(true); setError2(null);
      fetchCourseById(docId2)
        .then(setCourse2)
        .catch(err => { console.error(err); setError2('Failed to load document 2'); })
        .finally(() => setLoading2(false));
    } else {
      setCourse2(null);
    }
  }, [docId2]);

  return (
    <Box>
      <Title order={2} mb="md">Compare Documents</Title>
      {(loading1 || loading2) && <LoadingOverlay visible={true} />}
      {error1 && <Alert color="red" title="Error Doc 1" icon={<IconAlertCircle/>}>{error1}</Alert>}
      {error2 && <Alert color="red" title="Error Doc 2" icon={<IconAlertCircle/>}>{error2}</Alert>}
      
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ReadOnlyTiptapDisplay course={course1} title="Document 1" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ReadOnlyTiptapDisplay course={course2} title="Document 2" />
        </Grid.Col>
      </Grid>
      {!docId1 && !docId2 && (
         <Paper p="xl" withBorder style={{ textAlign: 'center', marginTop: '20px' }}>
            <Title order={4}>Select Documents for Comparison</Title>
            <p>Please select two courses from the sidebar to compare them side-by-side.</p>
          </Paper>
      )}
    </Box>
  );
};

export default ComparisonView;