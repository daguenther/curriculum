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
  // Box, // Not directly used
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconFileText,
  IconGitCompare,
  // IconDeviceFloppy,
  IconFolderOpen,
  IconAlertCircle,
  IconPlus,
  IconX,
} from '@tabler/icons-react';

import CurriculumEditor, { type CurriculumEditorRef } from './components/CurriculumEditor/CurriculumEditor';
import CompletionBadge from './components/CurriculumEditor/CompletionBadge';
import ComparisonView from './components/ComparisonView/ComparisonView';
import type { Course, Unit } from './types';
import {
  fetchCourseById,
  saveCourse,
  fetchAllCourseMetadata,
  type CourseMetadata,
} from './firebase';
import {
  tiptapJsonToCourse,
  COURSE_HEADER_SECTION_ID, // Ensure this is a valid, non-empty string
} from './components/CurriculumEditor/courseSerializer';
import { type JSONContent } from '@tiptap/core';

export const EMPTY_ARRAY_JSON_STRING = JSON.stringify([]);

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

  const [activeTab, setActiveTab] = useState<string>(COURSE_HEADER_SECTION_ID);
  const editorRef = useRef<CurriculumEditorRef>(null);

  useEffect(() => {
    if (viewMode === 'editor' && editorRef.current && currentCourse && activeTab) {
      if (typeof editorRef.current.scrollToSection === 'function') {
        editorRef.current.scrollToSection(activeTab);
      } else {
        console.warn("scrollToSection method is not available on editorRef.current");
      }
    }
  }, [activeTab, viewMode, currentCourse, editorKey]);

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
        // Ensure units have valid IDs; this is critical
        const validatedUnits = (courseData.units || []).filter(
          u => u && typeof u.id === 'string' && u.id.trim() !== ''
        );
        if (validatedUnits.length !== (courseData.units || []).length) {
            console.warn("Some units were filtered out due to missing or invalid IDs.");
        }

        const courseWithUnitsArray = { ...courseData, units: validatedUnits };
        setCurrentCourse(courseWithUnitsArray);
        setSelectedCourseId(courseId);
        setEditorKey((prev) => prev + 1);
        setActiveTab(COURSE_HEADER_SECTION_ID);
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
      const { id, ...saveData } = updatedCourseData;
      if (!id) {
        throw new Error('Course ID is missing for saving.');
      }
      await saveCourse(id, saveData);
      setCurrentCourse(updatedCourseData); // Re-set current course to reflect saved changes
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
      const newUnitId = `unit_${crypto.randomUUID()}`; // Ensures unique and valid ID
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
      const generatedCourseId = await saveCourse(null, newCourseData);
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

  const handleAddUnit = () => {
    if (!currentCourse) return;
    const newUnitId = `unit_${crypto.randomUUID()}`; // Ensures unique and valid ID
    const newUnit: Unit = {
      id: newUnitId,
      unitName: `New Unit ${ (currentCourse.units?.length || 0) + 1}`,
      timeAllotted: "Specify time", learningObjectives: EMPTY_ARRAY_JSON_STRING,
      standards: EMPTY_ARRAY_JSON_STRING, biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
      instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING,
      resources: EMPTY_ARRAY_JSON_STRING, assessments: EMPTY_ARRAY_JSON_STRING,
    };
    const updatedUnits = [...(currentCourse.units || []), newUnit];
    setCurrentCourse({ ...currentCourse, units: updatedUnits });
    setActiveTab(newUnitId); // Switch to the new unit tab
  };

  const handleRemoveUnit = (unitIdToRemove: string) => {
    if (!currentCourse) return;
    const updatedUnits = (currentCourse.units || []).filter(unit => unit.id !== unitIdToRemove);
    setCurrentCourse({ ...currentCourse, units: updatedUnits });
    if (activeTab === unitIdToRemove) {
      setActiveTab(COURSE_HEADER_SECTION_ID); // Switch to overall course if active unit is removed
    }
  };

  const courseOptions = coursesMetadata.map((meta) => ({
    value: meta.id,
    label: `${meta.title} (${meta.name || meta.id})`,
  }));

  useEffect(() => {
    // Ensure activeTab is valid with respect to the currentCourse
    if (currentCourse && activeTab !== COURSE_HEADER_SECTION_ID) {
      const unitExists = currentCourse.units?.some(unit => unit.id === activeTab);
      if (!unitExists) {
        setActiveTab(COURSE_HEADER_SECTION_ID);
      }
    } else if (!currentCourse && activeTab !== COURSE_HEADER_SECTION_ID) {
      // If no course is loaded, reset to default tab
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
        <Group h="100%" px="md">
          <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
          <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
          <Title order={3}>Curriculum Mapper</Title>
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
          {viewMode === 'comparison' && ( <Stack mt="xl" gap="md"> {/* ... Comparison setup ... */} </Stack> )}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'sm', blur: 2 }} />
        {error && ( <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" withCloseButton onClose={() => setError(null)} mb="md">{error}</Alert> )}

        {viewMode === 'editor' && currentCourse && selectedCourseId && (
          <>
            <Group justify="space-between" align="flex-end" mb="md" wrap="nowrap">
              <Tabs value={activeTab} onChange={(value) => { if (value) setActiveTab(value);}} style={{ flexGrow: 1 }}>
                <Tabs.List>
                  {/* Ensure COURSE_HEADER_SECTION_ID is a valid string */}
                  <Tabs.Tab
                    value={COURSE_HEADER_SECTION_ID}
                    rightSection={ <CompletionBadge data={currentCourse} sectionType="overall" /> }
                  >
                    Overall Course
                  </Tabs.Tab>
                  {(currentCourse.units || []).map((unit) => {
                    // Defensive check: Ensure unit and unit.id are valid before rendering Tab
                    // The root cause of invalid IDs should be fixed where units are created/fetched.
                    if (!unit || typeof unit.id !== 'string' || unit.id.trim() === '') {
                      console.warn("Skipping rendering Tab for unit with invalid id:", unit);
                      return null; // Don't render tab if ID is invalid
                    }
                    return (
                      <Tabs.Tab
                        key={unit.id} // Crucial: Unique key for list rendering
                        value={unit.id} // Crucial: Value for tab selection, must be valid string
                        rightSection={
                          <Group gap="xs" wrap="nowrap" style={{ display: 'flex', alignItems: 'center' }}>
                            <CompletionBadge data={unit} sectionType="unit" />
                            <ActionIcon
                              component="div" // FIX: Renders as a div to avoid nested buttons
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent Tab click
                                handleRemoveUnit(unit.id);
                              }}
                              title={`Remove ${unit.unitName || 'Unit'}`}
                              // Optional for accessibility if it needs to be focusable and keyboard actionable
                              // role="button"
                              // tabIndex={0}
                              // onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleRemoveUnit(unit.id); }}}
                            >
                              <IconX size={14} stroke={1.5} />
                            </ActionIcon>
                          </Group>
                        }
                      >
                        <Text truncate maw={120}>
                          {unit.unitName || 'Untitled Unit'}
                        </Text>
                      </Tabs.Tab>
                    );
                  })}
                </Tabs.List>
              </Tabs>
              <Button onClick={handleAddUnit} leftSection={<IconPlus size={16} />} variant="light" >
                Add Unit
              </Button>
            </Group>

            <CurriculumEditor
              ref={editorRef}
              key={editorKey} // For re-mounting when course changes
              initialCourseData={currentCourse}
              onSave={handleSuggestChanges}
              courseId={selectedCourseId}
            />
          </>
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