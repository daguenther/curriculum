// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppShell,
  Tooltip,
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
  // Tabs, // Tabs component not directly used for page structure here
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconFileText,
  IconGitCompare,
  IconDeviceFloppy,
  IconFolderOpen,
  IconAlertCircle,
  IconPlus,
  IconMarkdown,
} from '@tabler/icons-react';

// Make sure CurriculumEditorRef is exported from CurriculumEditor.tsx
import CurriculumEditor, { type CurriculumEditorRef } from './components/CurriculumEditor/CurriculumEditor';
import ComparisonView from './components/ComparisonView/ComparisonView';
// import StatusBar from './components/StatusBar/StatusBar'; // StatusBar imported but not used
import type { Course, Unit } from './types';
import {
  fetchCourseById,
  saveCourse,
  fetchAllCourseMetadata,
  type CourseMetadata,
} from './firebase';
import {
  // courseToTiptapJson, // Not used directly in App.tsx
  tiptapJsonToCourse,
} from './components/CurriculumEditor/courseSerializer';
import { type JSONContent } from '@tiptap/core';


export const EMPTY_ARRAY_JSON_STRING = JSON.stringify([]);

// FIX: Define COURSE_HEADER_SECTION_ID (ensure this ID matches an actual element ID in your Tiptap content)
const COURSE_HEADER_SECTION_ID = 'course-overview-header'; // Example ID

type ViewMode = 'editor' | 'comparison';

function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');

  const [coursesMetadata, setCoursesMetadata] = useState<CourseMetadata[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [editorKey, setEditorKey] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [compareDocId1, setCompareDocId1] = useState<string | null>(null);
  const [compareDocId2, setCompareDocId2] = useState<string | null>(null);

  // FIX: Declare activeTab state
  const [activeTab, setActiveTab] = useState<string>('overall');
  // FIX: Declare editorRef
  const editorRef = useRef<CurriculumEditorRef>(null);

  useEffect(() => {
    if (viewMode === 'editor' && editorRef.current && currentCourse && activeTab) {
      // Ensure the method exists on the ref before calling
      if (typeof editorRef.current.scrollToSection === 'function') {
        if (activeTab === 'overall') {
          editorRef.current.scrollToSection(COURSE_HEADER_SECTION_ID);
        } else {
          const unitExists = currentCourse.units?.find(unit => unit.id === activeTab);
          if (unitExists) {
            editorRef.current.scrollToSection(activeTab);
          } else {
            console.warn(`Unit with ID "${activeTab}" not found for scrolling. Scrolling to course header as fallback.`);
            editorRef.current.scrollToSection(COURSE_HEADER_SECTION_ID);
          }
        }
      } else {
        console.warn("scrollToSection method is not available on editorRef.current");
      }
    }
  }, [activeTab, currentCourse, editorKey, viewMode]); // editorRef is stable, so not strictly needed in deps

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
      setEditorKey((prev) => prev + 1);
      setActiveTab('overall');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const courseData = await fetchCourseById(courseId);
      if (courseData) {
        setCurrentCourse(courseData);
        setSelectedCourseId(courseId);
        setEditorKey((prev) => prev + 1);
        setActiveTab('overall');
      } else {
        setError(`Course with ID ${courseId} not found.`);
        setCurrentCourse(null);
        setSelectedCourseId(null);
        setActiveTab('overall');
      }
    } catch (err) {
      setError('Failed to load course.');
      console.error(err);
      setCurrentCourse(null);
      setSelectedCourseId(null);
      setActiveTab('overall'); // Reset tab on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestChanges = async (editorContent: JSONContent) => {
    if (!currentCourse || !selectedCourseId) {
      setError('No course loaded to suggest changes for.');
      return; // Potentially throw to be caught by CurriculumEditor if it handles Promise rejection
    }
    setIsLoading(true);
    setError(null);
    try {
      const updatedCourseData = tiptapJsonToCourse(editorContent, currentCourse);
      const { id, ...saveData } = updatedCourseData;
      if (!id) {
        throw new Error('Course ID is missing for saving.');
      }
      await saveCourse(id, saveData);
      // alert('Changes suggested successfully!'); // Notification is now in CurriculumEditor or can be here
      setCurrentCourse(updatedCourseData);
      // Optionally, show notification here if not in CurriculumEditor
      // notifications.show({ title: 'Success', message: 'Changes saved!', color: 'green' });
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown error during save.';
      setError(`Failed to suggest changes: ${errorMessage}`);
      console.error(err);
      throw err; // Re-throw so CurriculumEditor's catch block can also react if needed
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewCourse = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newUnitId = `unit_${Date.now()}`;
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
      const generatedCourseId = await saveCourse(null, newCourseData);
      alert('New course created! Loading it for editing...');
      await loadCourseMetadata();
      handleLoadCourse(generatedCourseId);
      setViewMode('editor');
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
          <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
          <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
          <Title order={3}>Curriculum Mapper</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Title order={4} mb="sm">Navigation</Title>
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
              else {
                setCurrentCourse(null);
                setSelectedCourseId(null);
                setEditorKey(k => k + 1);
                setActiveTab('overall');
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
        <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'sm', blur: 2 }} />
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

        {viewMode === 'editor' && currentCourse && selectedCourseId && (
          <CurriculumEditor
            ref={editorRef} // FIX: Pass the ref
            key={editorKey}
            initialCourseData={currentCourse}
            onSave={handleSuggestChanges} // FIX: Correct onSave handler
            courseId={selectedCourseId}
          />
        )}
        {viewMode === 'editor' && !currentCourse && !isLoading && (
          <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
            <IconFolderOpen size={48} stroke={1.5} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-6)' }} />
            <Title order={4}>No course selected</Title>
            <Text c="dimmed">Please select a course from the sidebar or create a new one to start editing.</Text>
          </Paper>
        )}
        {viewMode === 'comparison' && (
          <ComparisonView docId1={compareDocId1} docId2={compareDocId2} />
        )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;