// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppShell,
  Burger,
  Group,
  Title,
  NavLink,
  Stack,
  Button,
  LoadingOverlay,
  Alert,
  Paper,
  Text,
  Tabs,
  ActionIcon,
  ScrollArea,
  Notification,
  useMantineTheme,
  Modal, // Added for delete confirmation
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconFileText,
  IconFolderOpen,
  IconAlertCircle,
  IconPlus,
  IconX,
  IconCheck,
  IconBook,
  IconTrash, // Added for delete button in modal
} from '@tabler/icons-react';

import CurriculumEditor, { type CurriculumEditorRef } from './components/CurriculumEditor/CurriculumEditor';
import CompletionBadge from './components/CurriculumEditor/CompletionBadge';
import type { Course, Unit } from './types';
import {
  fetchCourseById,
  saveCourse,
  fetchAllCourseMetadata,
  type CourseMetadata,
} from './firebase';
import {
  tiptapJsonToCourse,
  COURSE_HEADER_SECTION_ID,
} from './components/CurriculumEditor/courseSerializer';
import { type JSONContent } from '@tiptap/react';
import { EMPTY_ARRAY_JSON_STRING } from './utils/constants';
import { calculateSectionCompletion } from './utils/completionUtils';


function App() {
  const theme = useMantineTheme();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  const [coursesMetadata, setCoursesMetadata] = useState<CourseMetadata[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [editorKey, setEditorKey] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveSuccessNotification, setShowSaveSuccessNotification] = useState(false);
  const [saveErrorNotification, setSaveErrorNotification] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>(COURSE_HEADER_SECTION_ID);
  const editorRef = useRef<CurriculumEditorRef>(null);

  // State for delete unit confirmation modal
  const [deleteUnitModalOpened, { open: openDeleteUnitModal, close: closeDeleteUnitModal }] = useDisclosure(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);


  const coursesBySubject = coursesMetadata.reduce((acc, course) => {
    const subject = course.department || 'Uncategorized';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(course);
    return acc;
  }, {} as Record<string, CourseMetadata[]>);

  const sortedSubjects = Object.keys(coursesBySubject).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });


  useEffect(() => {
    if (editorRef.current && currentCourse && activeTab) {
      if (typeof editorRef.current.scrollToSection === 'function') {
        setTimeout(() => editorRef.current!.scrollToSection(activeTab), 0);
      }
    }
  }, [activeTab, currentCourse, editorKey]);

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
      setShowSaveSuccessNotification(false);
      setSaveErrorNotification(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setShowSaveSuccessNotification(false);
    setSaveErrorNotification(null);
    try {
      const courseData = await fetchCourseById(courseId);
      if (courseData) {
        const validatedUnits = (courseData.units || []).filter(
          u => u && typeof u.id === 'string' && u.id.trim() !== ''
        );
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

  const handleSaveCourse = async (editorContent: JSONContent) => {
    if (!currentCourse || !selectedCourseId) {
      setSaveErrorNotification('No course loaded to save.');
      throw new Error('No course loaded.');
    }
    setIsLoading(true);
    setSaveErrorNotification(null);
    setShowSaveSuccessNotification(false);
    try {
      const updatedCourseDataFromEditor = tiptapJsonToCourse(editorContent, currentCourse);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, progress, ...saveDataInput } = updatedCourseDataFromEditor;

      await saveCourse(selectedCourseId, saveDataInput as Omit<Course, 'id' | 'progress'>);
      
      const reloadedCourse = await fetchCourseById(selectedCourseId);
      if (reloadedCourse) {
        setCurrentCourse(reloadedCourse);
      } else {
        setCurrentCourse({ ...updatedCourseDataFromEditor, id: selectedCourseId });
      }
      
      await loadCourseMetadata();
      
      setShowSaveSuccessNotification(true);

    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown error during save.';
      setSaveErrorNotification(`Failed to save course: ${errorMessage}`);
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewCourse = async () => {
    setIsLoading(true);
    setError(null);
    setSaveErrorNotification(null);
    setShowSaveSuccessNotification(false);
    try {
      const newUnitId = `unit_${crypto.randomUUID()}`;
      const newCourseData: Omit<Course, 'id' | 'progress'> = {
        title: "Untitled Course",
        department: "Uncategorized",
        description: EMPTY_ARRAY_JSON_STRING,
        biblicalBasis: EMPTY_ARRAY_JSON_STRING,
        materials: EMPTY_ARRAY_JSON_STRING,
        pacing: EMPTY_ARRAY_JSON_STRING,
        units: [{
            id: newUnitId, unitName: "Untitled Unit 1", timeAllotted: "Specify time",
            learningObjectives: EMPTY_ARRAY_JSON_STRING, standards: EMPTY_ARRAY_JSON_STRING,
            biblicalIntegration: EMPTY_ARRAY_JSON_STRING, instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING,
            resources: EMPTY_ARRAY_JSON_STRING, assessments: EMPTY_ARRAY_JSON_STRING,
          },],
      };
      const generatedCourseId = await saveCourse(null, newCourseData);
      await loadCourseMetadata();
      await handleLoadCourse(generatedCourseId);
      setShowSaveSuccessNotification(true);
    } catch (err) {
        const msg = `Failed to create new course: ${(err as Error).message}`;
        setError(msg);
        setSaveErrorNotification(msg);
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
    setEditorKey(prev => prev + 1);
    setActiveTab(newUnitId);
  };

  // Opens the confirmation modal
  const promptRemoveUnit = (unit: Unit) => {
    setUnitToDelete(unit);
    openDeleteUnitModal();
  };

  // Actually removes the unit after confirmation
  const confirmRemoveUnit = () => {
    if (!currentCourse || !unitToDelete) return;

    const unitIdToRemove = unitToDelete.id;
    const updatedUnits = (currentCourse.units || []).filter(u => u.id !== unitIdToRemove);
    const updatedCourse = { ...currentCourse, units: updatedUnits };
    setCurrentCourse(updatedCourse);
    setEditorKey(prev => prev + 1); // Re-initialize editor

    if (activeTab === unitIdToRemove) {
      setActiveTab(COURSE_HEADER_SECTION_ID); // Switch to overall if active tab was deleted
    }
    closeDeleteUnitModal();
    setUnitToDelete(null);
  };


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
    <> {/* Fragment to wrap AppShell and Modal */}
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
              {currentCourse && (
                <>
                  <Text size="lg" c="dimmed">|</Text>
                  <Text size="lg" fw={500} truncate style={{ whiteSpace: 'nowrap', maxWidth: '200px' }}>
                    {currentCourse.title || 'Unnamed Course'}
                  </Text>
                </>
              )}
            </Group>

            {currentCourse && selectedCourseId && (
              <Group gap="xs" align="center" style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
                <Tabs
                  value={activeTab}
                  onChange={(value) => { if (value) setActiveTab(value); }}
                  variant="pills"
                  style={{ flexShr: 1, overflow: 'hidden' }}
                  styles={{
                    tab: {
                      paddingTop: `calc(${theme.spacing.xs} / 3)`,
                      paddingBottom: `calc(${theme.spacing.xs} / 3)`,
                      paddingLeft: theme.spacing.sm,
                      paddingRight: theme.spacing.sm,
                      height: 'auto',
                      minHeight: '28px',
                      lineHeight: theme.lineHeight,
                    },
                  }}
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
                        return null;
                      }
                      const unitCompletion = calculateSectionCompletion(unit, 'unit');
                      const isUnitComplete = unitCompletion.percentage === 100;
                      const unitTabColorName = isUnitComplete ? 'green' : (unitCompletion.percentage > 0 ? 'yellow' : 'gray');
                      const unitTabThemeColor = theme.colors[unitTabColorName];

                      return (
                        <Tabs.Tab
                          key={unit.id}
                          value={unit.id}
                          style={ activeTab === unit.id ? { 
                              backgroundColor: unitTabThemeColor ? unitTabThemeColor[6] : theme.colors.blue[6],
                              color: theme.white,
                          } : {
                              backgroundColor: unitTabThemeColor ? unitTabThemeColor[1] : theme.colors.gray[1],
                              color: unitTabThemeColor ? unitTabThemeColor[8] : theme.colors.gray[8],
                          }
                          }
                          rightSection={
                            <Group gap={3} wrap="nowrap" style={{ display: 'flex', alignItems: 'center' }}>
                              <CompletionBadge data={unit} sectionType="unit" />
                              <ActionIcon
                                component="div"
                                size="xs"
                                variant="transparent"
                                color={activeTab === unit.id ? theme.white : theme.colors.red[6]}
                                onClick={(e) => { e.stopPropagation(); promptRemoveUnit(unit); }} // Changed to prompt
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

            {isLoading && coursesMetadata.length === 0 ? (
              <Text c="dimmed" ta="center" mt="md">Loading courses...</Text>
            ) : !isLoading && coursesMetadata.length === 0 ? (
              <Text c="dimmed" ta="center" mt="md">No courses yet. Create one!</Text>
            ) : (
              sortedSubjects.map((subject) => (
                <div key={subject} style={{ marginTop: '1rem' }}>
                  <NavLink
                    label={subject}
                    leftSection={<IconBook size="1.1rem" stroke={1.5} />}
                    opened
                    styles={(theme) => ({
                      root: { paddingLeft: theme.spacing.xs, paddingRight: theme.spacing.xs, marginBottom: `calc(${theme.spacing.xs} / 2)` },
                      label: { fontWeight: 600, fontSize: theme.fontSizes.sm, color: theme.colors.gray[7] },
                      children: { paddingLeft: `calc(${theme.spacing.sm} + 0.5rem)` },
                    })}
                  >
                    {coursesBySubject[subject].sort((a,b) => (a.title).localeCompare(b.title)).map((course) => (
                      <NavLink
                        key={course.id}
                        href={`#course-${course.id}`}
                        label={`${course.title} (${course.progress.toFixed(0)}%)`}
                        leftSection={<IconFileText size="0.9rem" stroke={1.5} />}
                        active={selectedCourseId === course.id}
                        onClick={() => {
                          handleLoadCourse(course.id);
                        }}
                        styles={{
                          root: { paddingTop: `calc(${theme.spacing.xs} / 2)`, paddingBottom: `calc(${theme.spacing.xs} / 2)`, minHeight: 'auto' },
                          label: { fontSize: theme.fontSizes.xs },
                        }}
                        disabled={isLoading}
                      />
                    ))}
                  </NavLink>
                </div>
              ))
            )}
          </ScrollArea>
        </AppShell.Navbar>

        <AppShell.Main>
          <LoadingOverlay visible={isLoading} overlayProps={{ radius: 'sm', blur: 2 }} />

          {currentCourse && selectedCourseId ? (
            <CurriculumEditor
              ref={editorRef}
              key={editorKey}
              initialCourseData={currentCourse}
              onSave={handleSaveCourse}
              courseId={selectedCourseId}
            />
          ) : !isLoading && coursesMetadata.length === 0 ? (
            <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
              <IconFolderOpen size={48} stroke={1.5} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-6)' }} />
              <Title order={4}>No course selected</Title>
              <Text c="dimmed">Please select a course from the sidebar or create a new one.</Text>
            </Paper>
          ) : !isLoading && coursesMetadata.length > 0 ? (
            <Paper p="xl" withBorder style={{ textAlign: 'center' }}>
              <IconFolderOpen size={48} stroke={1.5} style={{ marginBottom: '1rem', color: 'var(--mantine-color-gray-6)' }} />
              <Title order={4}>Select a Course</Title>
              <Text c="dimmed">Please select a course from the navigation menu to start editing.</Text>
            </Paper>
          ) : null }
        </AppShell.Main>
      </AppShell>

      {/* Delete Unit Confirmation Modal */}
      <Modal
        opened={deleteUnitModalOpened}
        onClose={() => {
          closeDeleteUnitModal();
          setUnitToDelete(null); // Clear the unit to delete if modal is closed without confirmation
        }}
        title={<Title order={4}>Confirm Delete Unit</Title>}
        centered
        size="sm"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        <Text>
          Are you sure you want to delete the unit: <Text span fw={700}>{unitToDelete?.unitName || 'this unit'}</Text>?
        </Text>
        <Text c="dimmed" size="sm">This action cannot be undone.</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => {
            closeDeleteUnitModal();
            setUnitToDelete(null);
          }}>
            Cancel
          </Button>
          <Button
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={confirmRemoveUnit}
          >
            Delete Unit
          </Button>
        </Group>
      </Modal>
    </>
  );
}

export default App;