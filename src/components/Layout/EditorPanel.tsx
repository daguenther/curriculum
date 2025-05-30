// src/components/Layout/EditorPanel.tsx
import React, { RefObject } from 'react';
import {
  Box,
  Paper,
  Text,
  Button,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { IconLogin, IconFolderOpen } from '@tabler/icons-react';
import type { User as FirebaseUser } from "firebase/auth";
import CurriculumEditor, { type CurriculumEditorRef } from '../CurriculumEditor/CurriculumEditor';
import type { Course, CourseMetadata } from '../../types';
import { type JSONContent } from '@tiptap/react';

interface EditorPanelProps {
  editorRef: RefObject<CurriculumEditorRef>;
  editorKey: number;
  currentCourse: Course | null;
  handleSubmitChanges: (editorContent: JSONContent) => Promise<void>;
  selectedCourseId: string | null;
  currentUser: FirebaseUser | null;
  signInWithGoogle: () => void;
  coursesMetadata: CourseMetadata[];
  isLoading: boolean; 
  authLoading: boolean; 
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  editorRef,
  editorKey,
  currentCourse,
  handleSubmitChanges,
  selectedCourseId,
  currentUser,
  signInWithGoogle,
  coursesMetadata,
  isLoading,
  authLoading,
}) => {
  const theme = useMantineTheme();

  if (!currentUser && !authLoading) {
    return (
      <Box style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Paper p="xl" withBorder style={{ textAlign: 'center', maxWidth: '400px' }}>
          <IconLogin size={48} stroke={1.5} style={{ marginBottom: '1rem', color: theme.colors.gray[6] }} />
          <Title order={4}>Please Log In</Title>
          <Text c="dimmed">Log in with your Google account to access the Curriculum Mapper.</Text>
          <Button onClick={signInWithGoogle} mt="md" size="md">Login with Google</Button>
        </Paper>
      </Box>
    );
  }

  if (currentUser && !currentCourse && !isLoading) {
    return (
      <Box style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Paper p="xl" withBorder style={{ textAlign: 'center', maxWidth: '400px' }}>
          <IconFolderOpen size={48} stroke={1.5} style={{ marginBottom: '1rem', color: theme.colors.gray[6] }} />
          <Title order={4}>{coursesMetadata.length === 0 ? "No Courses Found" : "Select a Course"}</Title>
          <Text c="dimmed">{coursesMetadata.length === 0 ? "Create a new course to get started or check your permissions." : "Please select an approved course from the menu."}</Text>
        </Paper>
      </Box>
    );
  }

  if (currentUser && currentCourse && selectedCourseId) {
    return (
      <Box style={{
        flexGrow: 1,
        height: '100%',
        overflow: 'hidden', // This Box itself does not scroll; scrolling is inside CurriculumEditor
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0, // Crucial for nested flex scrolling content
      }}>
        <CurriculumEditor
          ref={editorRef}
          key={editorKey}
          initialCourseData={currentCourse}
          onSave={handleSubmitChanges}
          courseId={selectedCourseId}
          isApprovedCourse={currentCourse.isApproved}
          isSuggestion={!currentCourse.isApproved && !!currentCourse.originalCourseId}
        />
      </Box>
    );
  }
  return null;
};

export default EditorPanel;