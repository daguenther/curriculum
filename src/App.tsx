// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppShell,
  Tooltip, // Added Tooltip
  Burger,
  Group,
  Title,
  NavLink,
  Stack,
  Select,
  Button,
  LoadingOverlay,
  Alert,
  Paper,
  Text,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconFileText,
  IconGitCompare,
  IconDeviceFloppy,
  IconFolderOpen,
  IconAlertCircle,
  IconPlus,
  IconMarkdown, // Added IconMarkdown
} from '@tabler/icons-react';

import CurriculumEditor, { type CurriculumEditorRef } from './components/CurriculumEditor/CurriculumEditor';
import ComparisonView from './components/ComparisonView/ComparisonView';
import StatusBar from './components/StatusBar/StatusBar'; // Import StatusBar
import type { Course, Unit } from './types';
import {
  fetchCourseById,
  saveCourse,
  fetchAllCourseMetadata,
  type CourseMetadata,
} from './firebase';
import {
  courseToTiptapJson,
  tiptapJsonToCourse,
} from './components/CurriculumEditor/courseSerializer';
import { type JSONContent } from '@tiptap/core';

// Define a constant for initializing empty rich text fields.
// This would typically go into a constants file (e.g., src/utils/constants.ts)
// export const EMPTY_RICH_TEXT_CONTENT = () => ({ type: 'doc', content: [{ type: 'paragraph' }] });
// Stored as string:
// export const EMPTY_ARRAY_JSON_STRING = JSON.stringify([]); // Represents empty content for a Tiptap field
// Now imported from constants.ts
import { EMPTY_ARRAY_JSON_STRING } from './utils/constants';


type ViewMode = 'editor' | 'comparison';

function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');

  const editorRef = useRef<CurriculumEditorRef>(null); // Added editorRef

  const [coursesMetadata, setCoursesMetadata] = useState<CourseMetadata[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [editorKey, setEditorKey] = useState<number>(0); // To force re-render Tiptap

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For comparison view
  const [compareDocId1, setCompareDocId1] = useState<string | null>(null);
  const [compareDocId2, setCompareDocId2] = useState<string | null>(null);

  const loadCourseMetadata = useCallback(async () => {
    setIsLoading(true);
    try {
      const metadata = await fetchAllCourseMetadata();
      setCoursesMetadata(metadata);
    } catch (err) {
      setError('Failed to load course list.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourseMetadata();
  }, [loadCourseMetadata]);

  const handleLoadCourse = async (courseId: string | null) => {
    if (!courseId) {
      setCurrentCourse(null);
      setSelectedCourseId(null);
      setEditorKey((prev) => prev + 1); // Reset editor
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const courseData = await fetchCourseById(courseId);
      if (courseData) {
        setCurrentCourse(courseData);
        setSelectedCourseId(courseId);
        setEditorKey((prev) => prev + 1); // Force re-initialization of Tiptap editor
      } else {
        setError(`Course with ID ${courseId} not found.`);
        setCurrentCourse(null);
        setSelectedCourseId(null);
      }
    } catch (err) {
      setError('Failed to load course.');
      console.error(err);
      setCurrentCourse(null);
      setSelectedCourseId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestChanges = async (editorContent: JSONContent) => {
    if (!currentCourse || !selectedCourseId) {
      setError('No course loaded to suggest changes for.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // currentCourse already contains stringified JSON for rich text fields (from load or previous save)
      // tiptapJsonToCourse expects the base course structure.
      const updatedCourseData = tiptapJsonToCourse(editorContent, currentCourse);

      // Remove 'id' before saving to Firestore, as it's the document key
      const { id, ...saveData } = updatedCourseData;
      if (!id) {
        throw new Error('Course ID is missing for saving.');
      }

      await saveCourse(id, saveData);
      alert('Changes suggested successfully!'); // Changed alert message
      // Update local state with the parsed data (which now has normalized rich text strings)
      setCurrentCourse(updatedCourseData);
      // Optionally, force editor refresh if normalization in tiptapJsonToCourse might change displayed content
      // setEditorKey(prev => prev + 1);
    } catch (err) {
      setError(`Failed to suggest changes: ${(err as Error).message}`); // Changed error message
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewCourse = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // const newCourseId = `new_course_${Date.now()}`; // Or use Firestore's auto-ID generation
      const newUnitId = `unit_${Date.now()}`; // This can remain locally generated for the unit within the course

      const newCourseData: Omit<Course, 'id'> = {
        title: "Untitled Course",
        name: "NEW001",
        description: EMPTY_ARRAY_JSON_STRING,
        biblicalBasis: EMPTY_ARRAY_JSON_STRING,
        materials: EMPTY_ARRAY_JSON_STRING,
        pacing: EMPTY_ARRAY_JSON_STRING,
        units: [
          {
            id: newUnitId,
            unitName: "Untitled Unit 1",
            timeAllotted: "1 Week",
            learningObjectives: EMPTY_ARRAY_JSON_STRING,
            standards: EMPTY_ARRAY_JSON_STRING,
            biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
            instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING,
            resources: EMPTY_ARRAY_JSON_STRING,
            assessments: EMPTY_ARRAY_JSON_STRING,
          },
        ],
      };
      // Call saveCourse with null to trigger auto-ID generation
      const generatedCourseId = await saveCourse(null, newCourseData);
      alert('New course created! Loading it for editing...');
      await loadCourseMetadata(); // Refresh course list
      handleLoadCourse(generatedCourseId); // Load the new course using the ID from Firebase
      setViewMode('editor'); // Switch to editor view

    } catch (err) {
        setError(`Failed to create new course: ${(err as Error).message}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };


  const courseOptions = coursesMetadata.map((meta) => ({
    value: meta.id,
    label: `${meta.title} (${meta.name || meta.id})`,
  }));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
          />
          <Burger
            opened={desktopOpened}
            onClick={toggleDesktop}
            visibleFrom="sm"
            size="sm"
          />
          <Title order={3}>
            Curriculum Mapper
            {currentCourse && currentCourse.title && ` | ${currentCourse.title}`}
          </Title>
          <Group ml="auto"> {/* Group for action buttons */}
            {viewMode === 'editor' && currentCourse && (
              <>
                <Tooltip label="Add a new unit" withArrow>
                  <Button
                    variant="light"
                    onClick={() => editorRef.current?.triggerAddUnit()}
                    disabled={!currentCourse || isLoading}
                    leftSection={<IconPlus size={16} />}
                  >
                    Add Unit
                  </Button>
                </Tooltip>
                <Tooltip label="Copy content as Markdown" withArrow>
                  <Button
                    variant="outline"
                    onClick={() => editorRef.current?.triggerCopyMarkdown()}
                    disabled={!currentCourse || isLoading}
                    leftSection={<IconMarkdown size={16} />}
                  >
                    Copy Markdown
                  </Button>
                </Tooltip>
                <Tooltip label="Submit your suggested changes" withArrow>
                  <Button
                    onClick={() => editorRef.current?.triggerSuggestChanges()}
                    disabled={!currentCourse || isLoading}
                    leftSection={<IconDeviceFloppy size={16} />}
                  >
                    Suggest Changes
                  </Button>
                </Tooltip>
              </>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Title order={4} mb="sm">
          Navigation
        </Title>
        <NavLink
          href="#editor"
          label="Curriculum Editor"
          leftSection={<IconFileText size="1rem" stroke={1.5} />}
          active={viewMode === 'editor'}
          onClick={() => setViewMode('editor')}
        />
        <NavLink
          href="#comparison"
          label="Compare Documents"
          leftSection={<IconGitCompare size="1rem" stroke={1.5} />}
          active={viewMode === 'comparison'}
          onClick={() => setViewMode('comparison')}
        />

        <Stack mt="xl" gap="md">
            <Title order={5}>Course Actions</Title>
             <Button
                leftSection={<IconPlus size="1rem" />}
                onClick={handleCreateNewCourse}
                variant="outline"
                disabled={isLoading}
            >
                New Course
            </Button>
            <Select
              label="Load Existing Course"
              placeholder="Pick a course"
              data={courseOptions}
              value={selectedCourseId}
              onChange={(value) => {
                if (value) handleLoadCourse(value);
                else { // Handle clear
                    setCurrentCourse(null);
                    setSelectedCourseId(null);
                    setEditorKey(k => k + 1);
                }
              }}
              disabled={isLoading}
              searchable
              clearable
            />
        </Stack>


        {viewMode === 'comparison' && (
          <Stack mt="xl" gap="md">
            <Title order={5}>Comparison Setup</Title>
            <Select
              label="Select Document 1"
              placeholder="Pick first course"
              data={courseOptions}
              value={compareDocId1}
              onChange={setCompareDocId1}
              disabled={isLoading}
              searchable
              clearable
            />
            <Select
              label="Select Document 2"
              placeholder="Pick second course"
              data={courseOptions}
              value={compareDocId2}
              onChange={setCompareDocId2}
              disabled={isLoading}
              searchable
              clearable
            />
          </Stack>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <LoadingOverlay
          visible={isLoading}
          overlayProps={{ radius: 'sm', blur: 2 }}
        />
        {error && (
          <Alert
            icon={<IconAlertCircle size="1rem" />}
            title="Error"
            color="red"
            withCloseButton
            onClose={() => setError(null)}
            mb="md"
          >
            {error}
          </Alert>
        )}

        {viewMode === 'editor' && (
          <>
            <StatusBar currentCourse={currentCourse} /> 
            {currentCourse && selectedCourseId && (
              <CurriculumEditor
                ref={editorRef} // Pass the ref
                key={editorKey} // Force re-mount when course changes for proper Tiptap init
                initialCourseData={currentCourse}
                onSave={handleSuggestChanges} 
                courseId={selectedCourseId}
              />
            )}
            {!currentCourse && !isLoading && (
              <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
                <IconFolderOpen
                  size={48}
                  stroke={1.5}
                  style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-6)' }}
                />
                <Title order={4}>No course selected</Title>
                <Text c="dimmed">
                  Please select a course from the sidebar or create a new one to
                  start editing.
                </Text>
              </Paper>
            )}
          </>
        )}
        {/* This part for CurriculumEditor and the "No course selected" message was restructured */}
        {/* {viewMode === 'editor' && currentCourse && selectedCourseId &&(
          <CurriculumEditor
            ref={editorRef} // Pass the ref
            key={editorKey} // Force re-mount when course changes for proper Tiptap init
            initialCourseData={currentCourse}
            onSave={handleSuggestChanges} 
            courseId={selectedCourseId}
          />
        )} */}
        {/* {viewMode === 'editor' && !currentCourse && !isLoading && (
          // This is now handled inside the new viewMode === 'editor' block
        )} */}

        {viewMode === 'comparison' && (
          <ComparisonView docId1={compareDocId1} docId2={compareDocId2} />
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;