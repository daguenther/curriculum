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
  TextInput, // Added
  Notification, // Added
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconFileText,
  // IconGitCompare, // Removed
  IconFolderOpen,
  IconAlertCircle,
  IconPlus,
  IconX,
  IconCheck, // Added
  IconDeviceFloppy, // Added
  IconBook, // Added for department header
} from '@tabler/icons-react';

import CurriculumEditor, { type CurriculumEditorRef } from './components/CurriculumEditor/CurriculumEditor';
import CompletionBadge from './components/CurriculumEditor/CompletionBadge'; // Assuming this exists
// import ComparisonView from './components/ComparisonView/ComparisonView'; // Removed
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

// type ViewMode = 'editor' | 'comparison'; // Removed

function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  // const [viewMode, setViewMode] = useState<ViewMode>('editor'); // Removed

  const [coursesMetadata, setCoursesMetadata] = useState<CourseMetadata[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [editorKey, setEditorKey] = useState<number>(0); // Used to re-mount editor on course change
  const [editedDepartment, setEditedDepartment] = useState<string>(''); // Added for department editing

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveSuccessNotification, setShowSaveSuccessNotification] = useState(false); // Added
  const [saveErrorNotification, setSaveErrorNotification] = useState<string | null>(null); // Added

  // const [compareDocId1, setCompareDocId1] = useState<string | null>(null); // Removed
  // const [compareDocId2, setCompareDocId2] = useState<string | null>(null); // Removed

  const [activeTab, setActiveTab] = useState<string>(COURSE_HEADER_SECTION_ID);
  const editorRef = useRef<CurriculumEditorRef>(null);

  // Group courses by department for the new navigation menu
  const coursesByDepartment = coursesMetadata.reduce((acc, course) => {
    const dept = course.department || 'Uncategorized'; // Ensure department exists
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(course);
    return acc;
  }, {} as Record<string, CourseMetadata[]>);
  // Sort department names, with "Uncategorized" appearing last or first as preferred
  const sortedDepartments = Object.keys(coursesByDepartment).sort((a, b) => {
    if (a === 'Uncategorized') return 1; // Push Uncategorized to the end
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b); // Sort other departments alphabetically
  });


  useEffect(() => {
    // if (viewMode === 'editor' && editorRef.current && currentCourse && activeTab) { // viewMode removed
    if (editorRef.current && currentCourse && activeTab) {
      // console.log(`App.tsx: Triggering scroll to ${activeTab} (editorKey: ${editorKey})`);
      if (typeof editorRef.current.scrollToSection === 'function') {
        // setTimeout is a good idea if content rendering or editor re-initialization is slow after key change
        setTimeout(() => editorRef.current!.scrollToSection(activeTab), 0);
      } else {
        console.warn("scrollToSection method is not available on editorRef.current");
      }
    }
  }, [activeTab, currentCourse, editorKey]); // viewMode removed from dependencies

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
      setEditedDepartment(''); // Reset edited department
      setEditorKey((prev) => prev + 1);
      setActiveTab(COURSE_HEADER_SECTION_ID);
      setShowSaveSuccessNotification(false); // Reset notification
      setSaveErrorNotification(null); // Reset notification
      // No need to setViewMode here as this function is also called when creating a new course
      return;
    }
    setIsLoading(true);
    setError(null);
    setShowSaveSuccessNotification(false); // Reset notification
    setSaveErrorNotification(null); // Reset notification
    // setViewMode('editor'); // No longer needed, editor is the only mode
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
        setEditedDepartment(courseData.department || 'Uncategorized'); // Initialize editedDepartment
        setEditorKey((prev) => prev + 1); // Force re-mount of editor
        setActiveTab(COURSE_HEADER_SECTION_ID); // Default to overall course view
      } else {
        setError(`Course with ID ${courseId} not found.`);
        setCurrentCourse(null);
        setSelectedCourseId(null);
        setEditedDepartment(''); // Reset
        setActiveTab(COURSE_HEADER_SECTION_ID);
      }
    } catch (err) {
      setError('Failed to load course.');
      console.error(err);
      setCurrentCourse(null);
      setSelectedCourseId(null);
      setEditedDepartment(''); // Reset
      setActiveTab(COURSE_HEADER_SECTION_ID);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDepartment = async () => {
    if (!currentCourse || !selectedCourseId || editedDepartment === currentCourse.department) {
      if (editedDepartment !== currentCourse?.department) {
        setSaveErrorNotification("Cannot save: No course loaded or department unchanged.");
      }
      return;
    }
    setIsLoading(true);
    setSaveErrorNotification(null);
    setShowSaveSuccessNotification(false);
    try {
      const updatedCourseData = { ...currentCourse, department: editedDepartment };
      // We only need to pass the fields that are part of the Course type for saving.
      // Explicitly create an object that matches Omit<Course, 'id'>
      const { id, ...dataToSave } = updatedCourseData;
      await saveCourse(selectedCourseId, dataToSave as Omit<Course, 'id'>); // Type assertion
      setCurrentCourse(updatedCourseData);
      await loadCourseMetadata(); // Refresh metadata to update nav/select options
      setShowSaveSuccessNotification(true);
      // Optional: auto-hide notification after a few seconds
      setTimeout(() => setShowSaveSuccessNotification(false), 3000);
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown error.';
      setSaveErrorNotification(`Failed to save department: ${errorMessage}`);
      console.error(err);
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
        department: "Uncategorized", // Added
        progress: 0, // Added
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
      // setViewMode('editor'); // No longer needed
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

  // const courseOptions = coursesMetadata.map((meta) => ({ // No longer needed for Select
  //   value: meta.id,
  //   label: `${meta.title} (${meta.name || meta.id})`,
  // }));

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
            {/* {viewMode === 'editor' && currentCourse && ( // viewMode removed */}
            {currentCourse && (
              <>
                <Text size="lg" c="dimmed">|</Text>
                <Text size="lg" fw={500} truncate style={{ whiteSpace: 'nowrap', maxWidth: '200px' }}>
                  {currentCourse.title || currentCourse.name || 'Unnamed Course'}
                </Text>
              </>
            )}
          </Group>

          {/* {viewMode === 'editor' && currentCourse && selectedCourseId && ( // viewMode removed */}
          {currentCourse && selectedCourseId && (
            <Group gap="xs" align="center" style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
              <TextInput
                placeholder="Enter department"
                value={editedDepartment}
                onChange={(event) => setEditedDepartment(event.currentTarget.value)}
                size="xs"
                style={{ width: 150, marginRight: 'auto' }} // Push tabs to the right
                disabled={isLoading}
              />
              <Button
                onClick={handleSaveDepartment}
                size="xs"
                variant="outline"
                leftSection={<IconDeviceFloppy size={14} />}
                disabled={isLoading || !currentCourse || editedDepartment === currentCourse.department}
              >
                Save Dept.
              </Button>
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
        <ScrollArea style={{ height: 'calc(100vh - 60px - 2 * var(--mantine-spacing-md))' }}>
          <Stack mb="md">
            <Button
              leftSection={<IconPlus size="1rem" />}
              onClick={handleCreateNewCourse}
              variant="filled"
              disabled={isLoading}
              fullWidth
            >
              New Course
            </Button>
          </Stack>

          {/* <NavLink // Keeping this for now, can be removed if only course selection sets editor mode
            label="Curriculum Editor"
            leftSection={<IconFileText size="1rem" stroke={1.5} />}
            active={viewMode === 'editor' && !!currentCourse} // Active if editor mode and a course is loaded
            onClick={() => {
              setViewMode('editor');
              if (!currentCourse && coursesMetadata.length > 0) {
                // Optionally, load the first course if none is selected
                // handleLoadCourse(coursesByDepartment[Object.keys(coursesByDepartment)[0]][0].id);
              } else if (!currentCourse) {
                // console.log("Editor clicked, but no course to show and no courses available.");
              }
            }}
            disabled={!currentCourse && coursesMetadata.length === 0} // Disable if no courses exist
          /> */}

          {isLoading && coursesMetadata.length === 0 ? (
            <Text c="dimmed" ta="center" mt="md">Loading courses...</Text>
          ) : !isLoading && coursesMetadata.length === 0 ? (
            <Text c="dimmed" ta="center" mt="md">No courses yet. Create one!</Text>
          ) : (
            sortedDepartments.map((dept) => (
              <div key={dept} style={{ marginTop: '1rem' }}> {/* Use div for spacing, NavLink for structure */}
                <NavLink
                  label={dept}
                  leftSection={<IconBook size="1.1rem" stroke={1.5} />}
                  opened // This makes it behave like a header, always showing children
                  styles={(theme) => ({
                    root: { paddingLeft: theme.spacing.xs, paddingRight: theme.spacing.xs, marginBottom: `calc(${theme.spacing.xs} / 2)` },
                    label: { fontWeight: 600, fontSize: theme.fontSizes.sm, color: theme.colors.gray[7] },
                    children: { paddingLeft: `calc(${theme.spacing.sm} + 0.5rem)` }, // Indent children further
                  })}
                  // No onClick needed for department header itself unless for collapsing (not implemented here)
                >
                  {coursesByDepartment[dept].sort((a,b) => (a.title || a.name).localeCompare(b.title || b.name)).map((course) => (
                    <NavLink
                      key={course.id}
                      href={`#course-${course.id}`} // Optional: for potential deep linking, not functional here
                      label={`${course.title || course.name} (${course.progress.toFixed(0)}%)`}
                      leftSection={<IconFileText size="0.9rem" stroke={1.5} />}
                      // active={selectedCourseId === course.id && viewMode === 'editor'} // viewMode removed
                      active={selectedCourseId === course.id}
                      onClick={() => {
                        handleLoadCourse(course.id);
                      }}
                      styles={(theme) => ({
                        root: { paddingTop: `calc(${theme.spacing.xs} / 2)`, paddingBottom: `calc(${theme.spacing.xs} / 2)`, minHeight: 'auto' },
                        label: { fontSize: theme.fontSizes.xs },
                      })}
                      disabled={isLoading}
                    />
                  ))}
                </NavLink>
              </div>
            ))
          )}
          {/* Removed old course actions and comparison setup from Navbar */}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'sm', blur: 2 }} />
        {error && !saveErrorNotification && ( <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" withCloseButton onClose={() => setError(null)} mb="md">{error}</Alert> )}
        {showSaveSuccessNotification && (
          <Notification
            icon={<IconCheck size="1.2rem" />}
            color="teal"
            title="Success"
            onClose={() => setShowSaveSuccessNotification(false)}
            style={{ position: 'fixed', top: 70, right: 20, zIndex: 1000 }}
          >
            Department saved successfully!
          </Notification>
        )}
        {saveErrorNotification && (
          <Notification
            icon={<IconAlertCircle size="1.2rem" />}
            color="red"
            title="Save Error"
            onClose={() => setSaveErrorNotification(null)}
            style={{ position: 'fixed', top: 70, right: 20, zIndex: 1000 }}
          >
            {saveErrorNotification}
          </Notification>
        )}

        {/* {viewMode === 'editor' && currentCourse && selectedCourseId && ( // viewMode removed */}
        {currentCourse && selectedCourseId ? (
          <CurriculumEditor
            ref={editorRef}
            key={editorKey} // Critical for re-mounting editor when course or structure changes
            initialCourseData={currentCourse}
            onSave={handleSuggestChanges}
            courseId={selectedCourseId}
          />
        ) : !isLoading && coursesMetadata.length === 0 ? (
          // This is the "No course selected" message when there are NO courses at all.
          <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
            <IconFolderOpen size={48} stroke={1.5} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-6)' }} />
            <Title order={4}>No course selected</Title>
            <Text c="dimmed">Please select a course from the sidebar or create a new one.</Text>
          </Paper>
        ) : !isLoading && coursesMetadata.length > 0 ? (
          // This is the "Select a Course" message when courses EXIST but none are selected.
           <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
            <IconFolderOpen size={48} stroke={1.5} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-6)' }} />
            <Title order={4}>Select a Course</Title>
            <Text c="dimmed">Please select a course from the navigation menu to start editing.</Text>
          </Paper>
        ) : null } {/* Covers the case where isLoading is true, LoadingOverlay is shown */}
        {/* ComparisonView and related logic fully removed */}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;