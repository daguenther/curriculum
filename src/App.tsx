// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppShell,
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
  Tabs,
  ActionIcon,
  ScrollArea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconFileText,
  IconGitCompare,
  IconFolderOpen,
  IconAlertCircle,
  IconPlus,
  IconX,
} from '@tabler/icons-react';

import CurriculumEditor, { type CurriculumEditorRef } from './components/CurriculumEditor/CurriculumEditor';
import CompletionBadge from './components/CurriculumEditor/CompletionBadge'; // Assuming this exists
import ComparisonView from './components/ComparisonView/ComparisonView'; // Assuming this exists
import type { Course, Unit } from './types'; // Assuming this exists
import {
  fetchCourseById,
  saveCourse,
  fetchAllCourseMetadata,
  type CourseMetadata,
} from './firebase'; // Assuming this exists
import {
  tiptapJsonToCourse,
  COURSE_HEADER_SECTION_ID, // Imported from your serializer
} from './components/CurriculumEditor/courseSerializer';
import { type JSONContent } from '@tiptap/react'; // Changed from @tiptap/core

// It's better to have this in a dedicated constants file, e.g., src/constants.ts
// and import it in both App.tsx and courseSerializer.ts
export const EMPTY_ARRAY_JSON_STRING = JSON.stringify([]);

type ViewMode = 'editor' | 'comparison';

function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');

  const [coursesMetadata, setCoursesMetadata] = useState<CourseMetadata[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [editorKey, setEditorKey] = useState<number>(0); // Used to re-mount editor on course change

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [compareDocId1, setCompareDocId1] = useState<string | null>(null); // For comparison view
  const [compareDocId2, setCompareDocId2] = useState<string | null>(null); // For comparison view

  const [activeTab, setActiveTab] = useState<string>(COURSE_HEADER_SECTION_ID);
  const editorRef = useRef<CurriculumEditorRef>(null);

  useEffect(() => {
    if (viewMode === 'editor' && editorRef.current && currentCourse && activeTab) {
      // console.log(`App.tsx: Triggering scroll to ${activeTab} (editorKey: ${editorKey})`);
      if (typeof editorRef.current.scrollToSection === 'function') {
        // setTimeout is a good idea if content rendering or editor re-initialization is slow after key change
        setTimeout(() => editorRef.current!.scrollToSection(activeTab), 0);
      } else {
        console.warn("scrollToSection method is not available on editorRef.current");
      }
    }
  }, [activeTab, viewMode, currentCourse, editorKey]); // editorKey ensures this runs after editor re-mounts

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
      setActiveTab(COURSE_HEADER_SECTION_ID);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const courseData = await fetchCourseById(courseId);
      if (courseData) {
        const validatedUnits = (courseData.units || []).filter(
          u => u && typeof u.id === 'string' && u.id.trim() !== ''
        );
        if (validatedUnits.length !== (courseData.units || []).length) {
            console.warn("Some units were filtered out due to missing or invalid IDs.");
        }
        const courseWithUnitsArray = { ...courseData, units: validatedUnits };
        setCurrentCourse(courseWithUnitsArray);
        setSelectedCourseId(courseId);
        setEditorKey((prev) => prev + 1); // Force re-mount of editor
        setActiveTab(COURSE_HEADER_SECTION_ID); // Default to overall course view
      } else {
        setError(`Course with ID ${courseId} not found.`);
        setCurrentCourse(null);
        setSelectedCourseId(null);
        setActiveTab(COURSE_HEADER_SECTION_ID);
      }
    } catch (err) {
      setError('Failed to load course.');
      console.error(err);
      setCurrentCourse(null);
      setSelectedCourseId(null);
      setActiveTab(COURSE_HEADER_SECTION_ID);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestChanges = async (editorContent: JSONContent) => {
    if (!currentCourse || !selectedCourseId) {
      setError('No course loaded to suggest changes for.');
      throw new Error('No course loaded.');
    }
    setIsLoading(true);
    setError(null);
    try {
      const updatedCourseData = tiptapJsonToCourse(editorContent, currentCourse);
      const { id, ...saveData } = updatedCourseData; // Destructure to separate ID from data to save
      if (!id) {
        throw new Error('Course ID is missing for saving.');
      }
      await saveCourse(id, saveData);
      setCurrentCourse(updatedCourseData); // Update local state with saved data
      // Optionally, you could reload the course from DB: await handleLoadCourse(id);
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown error during save.';
      setError(`Failed to suggest changes: ${errorMessage}`);
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewCourse = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newUnitId = `unit_${crypto.randomUUID()}`;
      const newCourseData: Omit<Course, 'id'> = {
        title: "Untitled Course", name: "NEW001",
        description: EMPTY_ARRAY_JSON_STRING, biblicalBasis: EMPTY_ARRAY_JSON_STRING,
        materials: EMPTY_ARRAY_JSON_STRING, pacing: EMPTY_ARRAY_JSON_STRING,
        units: [{
            id: newUnitId, unitName: "Untitled Unit 1", timeAllotted: "1 Week",
            learningObjectives: EMPTY_ARRAY_JSON_STRING, standards: EMPTY_ARRAY_JSON_STRING,
            biblicalIntegration: EMPTY_ARRAY_JSON_STRING, instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING,
            resources: EMPTY_ARRAY_JSON_STRING, assessments: EMPTY_ARRAY_JSON_STRING,
          },],
      };
      const generatedCourseId = await saveCourse(null, newCourseData); // Save and get new ID
      await loadCourseMetadata(); // Refresh course list
      await handleLoadCourse(generatedCourseId); // Load the new course
      setViewMode('editor');
    } catch (err) {
        setError(`Failed to create new course: ${(err as Error).message}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddUnit = () => {
    if (!currentCourse) return;
    const newUnitId = `unit_${crypto.randomUUID()}`;
    const newUnit: Unit = {
      id: newUnitId,
      unitName: `New Unit ${ (currentCourse.units?.length || 0) + 1}`,
      timeAllotted: "Specify time", learningObjectives: EMPTY_ARRAY_JSON_STRING,
      standards: EMPTY_ARRAY_JSON_STRING, biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
      instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING,
      resources: EMPTY_ARRAY_JSON_STRING, assessments: EMPTY_ARRAY_JSON_STRING,
    };
    const updatedUnits = [...(currentCourse.units || []), newUnit];
    const updatedCourse = { ...currentCourse, units: updatedUnits };
    setCurrentCourse(updatedCourse);
    // Update editor content immediately without saving to DB yet
    // This is tricky because tiptapJsonToCourse expects full editor JSON.
    // A simpler approach is to re-initialize the editor with the new unit.
    setEditorKey(prev => prev + 1); // This will trigger a re-render and re-initialization of editor content
    setActiveTab(newUnitId); // Switch to the new unit tab
  };

  const handleRemoveUnit = (unitIdToRemove: string) => {
    if (!currentCourse) return;
    const updatedUnits = (currentCourse.units || []).filter(unit => unit.id !== unitIdToRemove);
    const updatedCourse = { ...currentCourse, units: updatedUnits };
    setCurrentCourse(updatedCourse);
    setEditorKey(prev => prev + 1); // Re-initialize editor
    if (activeTab === unitIdToRemove) {
      setActiveTab(COURSE_HEADER_SECTION_ID);
    }
  };

  const courseOptions = coursesMetadata.map((meta) => ({
    value: meta.id,
    label: `${meta.title} (${meta.name || meta.id})`,
  }));

  useEffect(() => {
    if (currentCourse && activeTab !== COURSE_HEADER_SECTION_ID) {
      const unitExists = currentCourse.units?.some(unit => unit.id === activeTab);
      if (!unitExists) {
        setActiveTab(COURSE_HEADER_SECTION_ID);
      }
    } else if (!currentCourse && activeTab !== COURSE_HEADER_SECTION_ID) {
      setActiveTab(COURSE_HEADER_SECTION_ID);
    }
  }, [currentCourse, activeTab]);


  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !mobileOpened, desktop: !desktopOpened }, }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" align="center">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
            <Title order={3}>Curriculum Mapper</Title>
            {viewMode === 'editor' && currentCourse && (
              <>
                <Text size="lg" c="dimmed">|</Text>
                <Text size="lg" fw={500} truncate style={{ whiteSpace: 'nowrap', maxWidth: '200px' }}>
                  {currentCourse.title || currentCourse.name || 'Unnamed Course'}
                </Text>
              </>
            )}
          </Group>

          {viewMode === 'editor' && currentCourse && selectedCourseId && (
            <Group gap="xs" align="center" style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
              <Tabs
                value={activeTab}
                onChange={(value) => { if (value) setActiveTab(value); }}
                variant="pills"
                style={{ flexShr: 1, overflow: 'hidden' }}
                styles={(theme) => ({
                  list: { /* Potentially add flex and alignItems if needed for vertical centering with button */ },
                  tab: {
                    paddingTop: `calc(${theme.spacing.xs} / 3)`,
                    paddingBottom: `calc(${theme.spacing.xs} / 3)`,
                    paddingLeft: theme.spacing.sm,
                    paddingRight: theme.spacing.sm,
                    height: 'auto',
                    minHeight: '28px',
                    lineHeight: theme.lineHeight, // Use theme's line height
                  },
                })}
              >
                <Tabs.List>
                  <Tabs.Tab
                    value={COURSE_HEADER_SECTION_ID}
                    rightSection={ <CompletionBadge data={currentCourse} sectionType="overall" /> }
                  >
                    <Text size="xs" component="span">Overall</Text>
                  </Tabs.Tab>
                  {(currentCourse.units || []).map((unit) => {
                    if (!unit || typeof unit.id !== 'string' || unit.id.trim() === '') {
                      console.warn("Skipping rendering Tab for unit with invalid id:", unit);
                      return null;
                    }
                    return (
                      <Tabs.Tab
                        key={unit.id}
                        value={unit.id} // This value must match the sectionId used for scrolling
                        rightSection={
                          <Group gap={2} wrap="nowrap" style={{ display: 'flex', alignItems: 'center' }}>
                            <CompletionBadge data={unit} sectionType="unit" />
                            <ActionIcon
                              component="div"
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => { e.stopPropagation(); handleRemoveUnit(unit.id); }}
                              title={`Remove ${unit.unitName || 'Unit'}`}
                              style={{ height: '16px', width: '16px' }}
                            >
                              <IconX size={12} stroke={1.5} />
                            </ActionIcon>
                          </Group>
                        }
                      >
                        <Text truncate maw={80} component="span" size="xs">
                          {unit.unitName || 'Untitled Unit'}
                        </Text>
                      </Tabs.Tab>
                    );
                  })}
                </Tabs.List>
              </Tabs>
              <Button
                onClick={handleAddUnit}
                leftSection={<IconPlus size={12} />}
                variant="light"
                size="xs"
                style={{ alignSelf: 'center', paddingLeft: '8px', paddingRight: '8px' }}
              >
                Add Unit
              </Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <ScrollArea style={{ height: 'calc(100vh - 60px - 2 * var(--mantine-spacing-md))' }} >
          <Title order={4} mb="sm">Navigation</Title>
          <NavLink label="Curriculum Editor" leftSection={<IconFileText size="1rem" stroke={1.5} />} active={viewMode === 'editor'} onClick={() => setViewMode('editor')} />
          <NavLink label="Compare Documents" leftSection={<IconGitCompare size="1rem" stroke={1.5} />} active={viewMode === 'comparison'} onClick={() => setViewMode('comparison')} />
          <Stack mt="xl" gap="md">
            <Title order={5}>Course Actions</Title>
            <Button leftSection={<IconPlus size="1rem" />} onClick={handleCreateNewCourse} variant="outline" disabled={isLoading}>New Course</Button>
            <Select
              label="Load Existing Course" placeholder="Pick a course" data={courseOptions} value={selectedCourseId}
              onChange={(value) => handleLoadCourse(value)} disabled={isLoading} searchable clearable
            />
          </Stack>
          {viewMode === 'comparison' && (
            <Stack mt="xl" gap="md">
              <Title order={5}>Comparison Setup</Title>
              <Select label="Document 1" placeholder="Select first document" data={courseOptions} value={compareDocId1} onChange={setCompareDocId1} searchable clearable />
              <Select label="Document 2" placeholder="Select second document" data={courseOptions} value={compareDocId2} onChange={setCompareDocId2} searchable clearable />
            </Stack>
          )}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'sm', blur: 2 }} />
        {error && ( <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" withCloseButton onClose={() => setError(null)} mb="md">{error}</Alert> )}

        {viewMode === 'editor' && currentCourse && selectedCourseId && (
          <CurriculumEditor
            ref={editorRef}
            key={editorKey} // Critical for re-mounting editor when course or structure changes
            initialCourseData={currentCourse}
            onSave={handleSuggestChanges}
            courseId={selectedCourseId}
          />
        )}
        {viewMode === 'editor' && !currentCourse && !isLoading && (
          <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
            <IconFolderOpen size={48} stroke={1.5} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-6)' }} />
            <Title order={4}>No course selected</Title>
            <Text c="dimmed">Please select a course from the sidebar or create a new one.</Text>
          </Paper>
        )}
        {viewMode === 'comparison' && ( <ComparisonView docId1={compareDocId1} docId2={compareDocId2} /> )}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;