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
  useMantineTheme,
  Modal,
  Menu,
  Avatar,
  Badge,
  Box,
  Flex,
  Divider,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconFileText,
  IconFolderOpen,
  IconAlertCircle,
  IconPlus,
  IconX,
  IconCheck,
  IconBook,
  IconTrash,
  IconLogin,
  IconLogout,
  IconUserCircle,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';
import type { User as FirebaseUser } from "firebase/auth";

import CurriculumEditor, { type CurriculumEditorRef } from './components/CurriculumEditor/CurriculumEditor';
import CompletionBadge from './components/CurriculumEditor/CompletionBadge';
import type { Course, Unit } from './types';
import {
  fetchCourseById,
  submitCourseChanges,
  fetchAllCourseMetadata,
  type CourseMetadata,
  signInWithGoogle,
  signOutUser,
  onAuthStateChangedObservable,
} from './firebase';
import {
  tiptapJsonToCourse,
  COURSE_HEADER_SECTION_ID,
} from './components/CurriculumEditor/courseSerializer';
import { type JSONContent } from '@tiptap/react';
import { EMPTY_ARRAY_JSON_STRING } from './utils/constants';
import { calculateSectionCompletion } from './utils/completionUtils';
import { notifications } from '@mantine/notifications';

// const ADMIN_EMAILS_APP = ['dguenther@legacyknights.org']; // Commented out as not directly relevant to the issue

// Reusable component for the content of the Navbar/Menu
const CourseNavigationContent: React.FC<{
  isLoading: boolean;
  currentUser: FirebaseUser | null;
  coursesMetadata: CourseMetadata[];
  sortedSubjects: string[];
  coursesBySubject: Record<string, CourseMetadata[]>;
  selectedCourseId: string | null;
  onCreateNewCourse: () => void;
  onLoadCourse: (id: string) => void;
  closeMenu?: () => void;
  renderAs: 'menuitem' | 'navlink';
}> = ({
  isLoading,
  currentUser,
  coursesMetadata,
  sortedSubjects,
  coursesBySubject,
  selectedCourseId,
  onCreateNewCourse,
  onLoadCourse,
  closeMenu,
  renderAs
}) => {
  const theme = useMantineTheme();

  const handleCreate = () => {
    onCreateNewCourse();
    if (closeMenu) closeMenu();
  }

  const handleLoad = (id: string) => {
    onLoadCourse(id);
    if (closeMenu) closeMenu();
  }

  return (
    <>
      {currentUser && (
        <Stack mb="md" p="xs">
          <Button
            leftSection={<IconPlus size="1rem" />}
            onClick={handleCreate}
            variant="filled"
            disabled={isLoading || !currentUser}
            fullWidth
          >
            New Course
          </Button>
        </Stack>
      )}

      {!currentUser && <Text c="dimmed" ta="center" mt="xl" p="xs">Please log in to see courses.</Text>}

      {currentUser && isLoading && coursesMetadata.length === 0 && <Text c="dimmed" ta="center" mt="md" p="xs">Loading courses...</Text>}
      {currentUser && !isLoading && coursesMetadata.length === 0 && <Text c="dimmed" ta="center" mt="md" p="xs">No courses available, or create a new one.</Text>}

      {currentUser && !isLoading && coursesMetadata.length > 0 && sortedSubjects.map((subject) => (
          <div key={subject} style={{ marginTop: '0.5rem' }}>
            {renderAs === 'navlink' ? (
                <NavLink
                    label={subject}
                    leftSection={<IconBook size="1.1rem" stroke={1.5} />}
                    opened // Keep sections open by default
                    defaultOpened // Ensure it's open on initial render
                    styles={{
                        root: { paddingLeft: theme.spacing.xs, paddingRight: theme.spacing.xs, marginBottom: `calc(${theme.spacing.xs} / 2)` },
                        label: { fontWeight: 600, fontSize: theme.fontSizes.sm, color: theme.colors.gray[7] },
                        children: { paddingLeft: `calc(${theme.spacing.sm} + 0.5rem)` },
                    }}
                    p="xs"
                >
                    {coursesBySubject[subject]
                        .filter(course => course.isApproved)
                        .sort((a,b) => (a.title).localeCompare(b.title))
                        .map((course) => (
                            <NavLink
                                key={course.id}
                                href={`#course-${course.id}`}
                                label={`${course.title} (v${course.version || 1}) - ${course.progress.toFixed(0)}%`}
                                leftSection={<IconFileText size="0.9rem" stroke={1.5} />}
                                active={selectedCourseId === course.id}
                                onClick={() => handleLoad(course.id)}
                                styles={{
                                    root: { paddingTop: `calc(${theme.spacing.xs} / 2)`, paddingBottom: `calc(${theme.spacing.xs} / 2)`, minHeight: 'auto' },
                                    label: { fontSize: theme.fontSizes.xs },
                                }}
                                disabled={isLoading}
                            />
                        ))}
                </NavLink>
            ) : ( // renderAs === 'menuitem'
                <>
                    <Box
                        p="xs"
                        style={{
                            fontWeight: 600,
                            fontSize: theme.fontSizes.sm,
                            color: theme.colors.gray[7],
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                      <IconBook size="1.1rem" style={{ marginRight: theme.spacing.xs }} />
                      {subject}
                    </Box>
                    <Stack gap={0} pl={`calc(${theme.spacing.sm} + 0.5rem)`}>
                      {coursesBySubject[subject]
                          .filter(course => course.isApproved)
                          .sort((a,b) => (a.title).localeCompare(b.title))
                          .map((course) => (
                        <Menu.Item
                          key={course.id}
                          leftSection={<IconFileText size="0.9rem" stroke={1.5} />}
                          onClick={() => handleLoad(course.id)}
                          disabled={isLoading}
                          style={selectedCourseId === course.id ?
                                 { backgroundColor: theme.colors[theme.primaryColor][0], fontWeight: 500 } :
                                 {}
                                }
                        >
                          <Text size="xs">{`${course.title} (v${course.version || 1}) - ${course.progress.toFixed(0)}%`}</Text>
                        </Menu.Item>
                      ))}
                    </Stack>
                </>
            )}
          </div>
        ))}
    </>
  );
};


function App() {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const [mobileOpened, { toggle: toggleMobile, close: closeMobileNavbar }] = useDisclosure(false);
  const [desktopMenuOpened, { toggle: toggleDesktopMenu, close: closeDesktopMenu }] = useDisclosure(false);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [coursesMetadata, setCoursesMetadata] = useState<CourseMetadata[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [editorKey, setEditorKey] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>(COURSE_HEADER_SECTION_ID);
  const editorRef = useRef<CurriculumEditorRef>(null);

  const [deleteUnitModalOpened, { open: openDeleteUnitModal, close: closeDeleteUnitModal }] = useDisclosure(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedObservable((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user) {
        setCurrentCourse(null); setSelectedCourseId(null); setCoursesMetadata([]);
        closeMobileNavbar();
        closeDesktopMenu();
      }
    });
    return () => unsubscribe();
  }, [closeMobileNavbar, closeDesktopMenu]);

  const coursesBySubject = coursesMetadata.reduce((acc, course) => {
    const subject = course.department || 'Uncategorized';
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(course);
    return acc;
  }, {} as Record<string, CourseMetadata[]>);

  const sortedSubjects = Object.keys(coursesBySubject).sort((a, b) => {
    if (a === 'Uncategorized') return 1; if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  useEffect(() => {
    console.log(`[DEBUG App.tsx useEffect scrollToSection] Triggered. activeTab: ${activeTab}, currentCourse loaded: ${!!currentCourse}, editorKey: ${editorKey}`);
    if (currentCourse && activeTab && editorRef.current) {
        console.log(`[DEBUG App.tsx useEffect scrollToSection] Conditions met. Setting timeout for scrollToSection for tab: ${activeTab}.`);
        const timeoutId = setTimeout(() => {
            console.log(`[DEBUG App.tsx useEffect scrollToSection] Timeout fired. Calling editorRef.current.scrollToSection('${activeTab}')`);
            if (editorRef.current && typeof editorRef.current.scrollToSection === 'function') {
                editorRef.current.scrollToSection(activeTab);
            } else {
                console.warn(`[DEBUG App.tsx useEffect scrollToSection] editorRef.current or scrollToSection not available in timeout. editorRef.current:`, editorRef.current);
            }
        }, 10); // Changed timeout to 400ms
        return () => {
            console.log(`[DEBUG App.tsx useEffect scrollToSection] Clearing timeout for tab: ${activeTab}`);
            clearTimeout(timeoutId);
        };
    } else {
        console.log(`[DEBUG App.tsx useEffect scrollToSection] Conditions NOT met. currentCourse: ${!!currentCourse}, activeTab: ${activeTab}, editorRef.current: ${!!editorRef.current}`);
    }
  }, [activeTab, currentCourse, editorKey]);

  const loadCourseMetadata = useCallback(async () => {
    if (!currentUser && !authLoading) { setCoursesMetadata([]); return; }
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const metadata = await fetchAllCourseMetadata(currentUser.email, true);
      setCoursesMetadata(metadata);
    } catch (err) {
      setError('Failed to load course list.');
      notifications.show({ title: 'Error', message: 'Failed to load course list.', color: 'red'});
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, authLoading]);

  useEffect(() => {
    if (!authLoading) loadCourseMetadata();
  }, [loadCourseMetadata, authLoading]);

  const handleLoadCourse = async (courseId: string | null) => {
    console.log(`[DEBUG App.tsx handleLoadCourse] Loading course: ${courseId}`);
    if (!currentUser) {
        notifications.show({ title: 'Login Required', message: 'Please log in to load a course.', color: 'yellow' });
        return;
    }
    if (!courseId) {
      setCurrentCourse(null); setSelectedCourseId(null); setEditorKey(prev => prev + 1); setActiveTab(COURSE_HEADER_SECTION_ID);
      console.log(`[DEBUG App.tsx handleLoadCourse] No courseId provided, resetting state. New editorKey: ${editorKey + 1}`);
      return;
    }
    setIsLoading(true); setError(null);
    try {
      const courseData = await fetchCourseById(courseId);
      if (courseData) {
          const validatedUnits = (courseData.units || []).filter(u => u && typeof u.id === 'string' && u.id.trim() !== '');
          setCurrentCourse({ ...courseData, units: validatedUnits });
          setSelectedCourseId(courseId);
          setEditorKey(prev => prev + 1);
          setActiveTab(COURSE_HEADER_SECTION_ID);
          console.log(`[DEBUG App.tsx handleLoadCourse] Course ${courseId} loaded. New editorKey: ${editorKey + 1}, activeTab set to ${COURSE_HEADER_SECTION_ID}`);
          if (isMobile) closeMobileNavbar();
          else closeDesktopMenu();

      } else {
        setError(`Course with ID ${courseId} not found. The summary might exist, but the full course data is missing.`);
        notifications.show({ title: 'Error', message: `Course with ID ${courseId} not found.`, color: 'red' });
        setCurrentCourse(null); setSelectedCourseId(null); setActiveTab(COURSE_HEADER_SECTION_ID);
        console.warn(`[DEBUG App.tsx handleLoadCourse] Course ${courseId} not found in DB.`);
      }
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
      setError(`Failed to load course: ${errorMessage}`);
      notifications.show({ title: 'Error', message: `Failed to load course: ${errorMessage}`, color: 'red' });
      console.error(err);
      setCurrentCourse(null); setSelectedCourseId(null); setActiveTab(COURSE_HEADER_SECTION_ID);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitChanges = async (editorContent: JSONContent) => {
    if (!currentUser) {
      notifications.show({ title: 'Login Required', message: 'You must be logged in to submit changes.', color: 'red' });
      throw new Error('User not logged in.');
    }
    if (!currentCourse) {
      notifications.show({ title: 'Error', message: 'No course data available to submit changes for.', color: 'red' });
      throw new Error('No course data available.');
    }
    setIsLoading(true); setError(null);
    try {
      const courseDataFromEditor = tiptapJsonToCourse(editorContent, currentCourse);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, progress, isApproved, submittedAt, submittedBy, version, originalCourseId, ...contentToSubmit } = courseDataFromEditor;
      const baseCourseIdForOperation = selectedCourseId;

      const wasApprovedBeforeSubmit = currentCourse.isApproved;

      const newId = await submitCourseChanges(
        baseCourseIdForOperation, contentToSubmit, currentUser.email || 'unknown@example.com'
      );
      await loadCourseMetadata();
      await handleLoadCourse(newId);

      const message = wasApprovedBeforeSubmit && baseCourseIdForOperation !== newId ?
          'Your suggestion has been submitted!' :
          (baseCourseIdForOperation && baseCourseIdForOperation === newId && !wasApprovedBeforeSubmit ?
              'Your suggestion has been updated!' :
              (!baseCourseIdForOperation ? 'New course created successfully!' :
                'Course changes saved!'
              ));
      notifications.show({ title: 'Success!', message, color: 'teal', icon: <IconCheck size={18}/>, autoClose: 3000 });
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown error during submission.';
      setError(`Failed to submit changes: ${errorMessage}`);
      notifications.show({ title: 'Submission Failed', message: `Failed to submit changes: ${errorMessage}`, color: 'red' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewCourse = async () => {
    if (!currentUser) {
      notifications.show({ title: 'Login Required', message: 'Please log in to create a course.', color: 'yellow' }); return;
    }
    setIsLoading(true); setError(null);
    try {
      const newUnitId = `unit_${crypto.randomUUID()}`;
      const newCourseContent: Omit<Course, 'id' | 'progress' | 'isApproved' | 'submittedAt' | 'submittedBy' | 'version' | 'originalCourseId'> = {
        title: "Untitled Course", department: "Uncategorized", description: EMPTY_ARRAY_JSON_STRING,
        biblicalBasis: EMPTY_ARRAY_JSON_STRING, materials: EMPTY_ARRAY_JSON_STRING, pacing: EMPTY_ARRAY_JSON_STRING,
        units: [{
            id: newUnitId, unitName: "Untitled Unit 1", timeAllotted: "Specify time", learningObjectives: EMPTY_ARRAY_JSON_STRING,
            standards: EMPTY_ARRAY_JSON_STRING, biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
            instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING, resources: EMPTY_ARRAY_JSON_STRING, assessments: EMPTY_ARRAY_JSON_STRING,
          },],
      };
      const generatedCourseId = await submitCourseChanges(null, newCourseContent, currentUser.email || 'unknown@example.com');
      await loadCourseMetadata();
      await handleLoadCourse(generatedCourseId);
      notifications.show({ title: 'Success!', message: 'New course created successfully!', color: 'teal', icon: <IconCheck size={18}/>, autoClose: 3000});
    } catch (err) {
        const msg = `Failed to create new course: ${(err as Error).message}`;
        setError(msg); notifications.show({ title: 'Error', message: msg, color: 'red' }); console.error(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddUnit = () => {
    if (!currentCourse || !currentUser) return;
    if (!currentCourse.isApproved && currentCourse.originalCourseId) {
        notifications.show({ title: 'Action Denied', message: 'Adding units is disabled for suggestions based on an existing approved course. Edit the main course or create a new one.', color: 'orange'}); return;
    }
    const newUnitId = `unit_${crypto.randomUUID()}`;
    const newUnit: Unit = {
      id: newUnitId, unitName: `New Unit ${ (currentCourse.units?.length || 0) + 1}`, timeAllotted: "Specify time",
      learningObjectives: EMPTY_ARRAY_JSON_STRING, standards: EMPTY_ARRAY_JSON_STRING, biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
      instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING, resources: EMPTY_ARRAY_JSON_STRING, assessments: EMPTY_ARRAY_JSON_STRING,
    };
    setCurrentCourse(prev => prev ? { ...prev, units: [...(prev.units || []), newUnit] } : null);
    setEditorKey(prev => prev + 1);
    setActiveTab(newUnitId);
    console.log(`[DEBUG App.tsx handleAddUnit] Added unit ${newUnitId}. New editorKey: ${editorKey + 1}, activeTab: ${newUnitId}`);
  };

  const promptRemoveUnit = (unit: Unit) => {
    if (!currentCourse?.isApproved && currentCourse?.originalCourseId) {
         notifications.show({ title: 'Action Denied', message: 'Removing units is disabled for suggestions based on an existing approved course.', color: 'orange'}); return;
    }
    setUnitToDelete(unit); openDeleteUnitModal();
  };

  const confirmRemoveUnit = () => {
    if (!currentCourse || !unitToDelete || !currentUser) return;
    const newUnits = (currentCourse.units || []).filter(u => u.id !== unitToDelete.id);
    setCurrentCourse(prev => prev ? { ...prev, units: newUnits } : null);
    setEditorKey(prev => prev + 1);
    console.log(`[DEBUG App.tsx confirmRemoveUnit] Removed unit ${unitToDelete.id}. New editorKey: ${editorKey + 1}`);
    if (activeTab === unitToDelete.id) {
      setActiveTab(COURSE_HEADER_SECTION_ID);
      console.log(`[DEBUG App.tsx confirmRemoveUnit] Active tab was deleted unit, setting activeTab to ${COURSE_HEADER_SECTION_ID}`);
    }
    closeDeleteUnitModal(); setUnitToDelete(null);
  };

  useEffect(() => {
    if (currentCourse && activeTab !== COURSE_HEADER_SECTION_ID) {
      if (!(currentCourse.units || []).some(unit => unit.id === activeTab)) {
        console.log(`[DEBUG App.tsx useEffect activeTabCheck] Active tab ${activeTab} no longer valid, resetting to ${COURSE_HEADER_SECTION_ID}`);
        setActiveTab(COURSE_HEADER_SECTION_ID);
      }
    } else if (!currentCourse && activeTab !== COURSE_HEADER_SECTION_ID) {
      console.log(`[DEBUG App.tsx useEffect activeTabCheck] No current course, resetting activeTab ${activeTab} to ${COURSE_HEADER_SECTION_ID}`);
      setActiveTab(COURSE_HEADER_SECTION_ID);
    }
  }, [currentCourse, activeTab]);

  const HEADER_HEIGHT = 60;
  const VERTICAL_TABS_WIDTH = 240;

  if (authLoading) return <LoadingOverlay visible={true} overlayProps={{radius: "sm", blur: 2}} />;

  const courseNavSharedProps = {
      isLoading, currentUser, coursesMetadata, sortedSubjects, coursesBySubject, selectedCourseId,
      onCreateNewCourse: handleCreateNewCourse,
      onLoadCourse: handleLoadCourse,
  };

  return (
    <>
      <AppShell
        header={{ height: HEADER_HEIGHT }}
        navbar={{
            width: 300, breakpoint: 'sm',
            collapsed: { desktop: true, mobile: !mobileOpened }
        }}
        padding={0}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Group gap="xs" align="center">
              <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
              <Box visibleFrom="sm">
                <Menu
                    opened={desktopMenuOpened}
                    onChange={toggleDesktopMenu}
                    shadow="md" width={300} trigger="click"
                    position="bottom-start"
                    closeOnClickOutside={true}
                >
                  <Menu.Target>
                    <Button
                        variant="subtle"
                        size="sm"
                        leftSection={<IconLayoutSidebarLeftExpand size="1.2rem" />}
                        px="xs"
                    >
                      Courses
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <ScrollArea style={{ maxHeight: 'calc(100vh - 120px)', paddingRight: '10px' }}>
                        <CourseNavigationContent {...courseNavSharedProps} renderAs="menuitem" closeMenu={closeDesktopMenu} />
                    </ScrollArea>
                  </Menu.Dropdown>
                </Menu>
              </Box>
              <Title order={3} ml={isMobile ? 0 : "xs"}>Curriculum Mapper</Title>
              {currentCourse && (
                <>
                  <Text size="lg" c="dimmed" visibleFrom="sm">|</Text>
                  <Text size="lg" fw={500} truncate style={{ whiteSpace: 'nowrap', maxWidth: isMobile? '100px' : '180px' }}>
                    {currentCourse.title || 'Unnamed Course'}
                  </Text>
                  {!currentCourse.isApproved && <Badge color="orange" variant="light" ml="xs">Suggestion</Badge>}
                </>
              )}
            </Group>
            <Group>
                {currentUser ? (
                    <Menu shadow="md" width={200}>
                        <Menu.Target>
                            <Button variant="subtle" size="sm" leftSection={ currentUser.photoURL ? <Avatar src={currentUser.photoURL} alt="User" radius="xl" size="sm" /> : <IconUserCircle size="1.2rem" /> }>
                                <Text size="sm" truncate maw={100}>{currentUser.displayName || currentUser.email}</Text>
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>{currentUser.email}</Menu.Label>
                            <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={signOutUser}>Logout</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                ) : (
                    <Button onClick={signInWithGoogle} leftSection={<IconLogin size="1rem"/>} variant="outline" size="sm">Login with Google</Button>
                )}
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p={0}>
             <ScrollArea style={{ height: '100%' }}>
                <CourseNavigationContent {...courseNavSharedProps} renderAs="navlink" closeMenu={closeMobileNavbar} />
            </ScrollArea>
        </AppShell.Navbar>

        <AppShell.Main style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)`, overflow: 'hidden', padding: 0 }}>
          <LoadingOverlay visible={isLoading && !authLoading} overlayProps={{ radius: 'sm', blur: 2 }} />
          {error && ( <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" withCloseButton onClose={() => setError(null)} m="md">{error}</Alert> )}

          {!currentUser && !authLoading && ( <Paper p="xl" withBorder style={{ textAlign: 'center', margin: 'auto', maxWidth: '400px', marginTop: '10vh' }}> <IconLogin size={48} stroke={1.5} style={{ marginBottom: '1rem', color: theme.colors.gray[6] }} /> <Title order={4}>Please Log In</Title> <Text c="dimmed">Log in with your Google account to access the Curriculum Mapper.</Text> <Button onClick={signInWithGoogle} mt="md" size="md">Login with Google</Button> </Paper> )}

          {currentUser && !currentCourse && !isLoading && (
            <Paper p="xl" withBorder style={{ textAlign: 'center', margin: 'auto', maxWidth: '400px', marginTop: '10vh' }}>
                <IconFolderOpen size={48} stroke={1.5} style={{ marginBottom: '1rem', color: theme.colors.gray[6] }} />
                <Title order={4}>{coursesMetadata.length === 0 ? "No Courses Found" : "Select a Course"}</Title>
                <Text c="dimmed">{coursesMetadata.length === 0 ? "Create a new course to get started or check your permissions." : "Please select an approved course from the menu."}</Text>
            </Paper>
          )}

          {currentUser && currentCourse && selectedCourseId && (
            <Flex style={{ height: '100%', width: '100%' }}>
              <Box w={VERTICAL_TABS_WIDTH} style={
                {
                  borderRight: `1px solid ${theme.colors.gray[3]}`,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflowY: 'hidden'
                }
              }>
                <ScrollArea style={{ flexGrow: 1 }} type="auto" p="md">
                  <Tabs value={activeTab} onChange={(value) => {
                      if (value) {
                          console.log(`[DEBUG App.tsx Tabs onChange] Tab changed to: ${value}`);
                          setActiveTab(value);
                      }
                    }}
                    orientation="vertical" variant="pills"
                    styles={{
                        list: { borderRight: 0 },
                        tab: { width: '100%', justifyContent: 'flex-start', padding: `${theme.spacing.xs} ${theme.spacing.sm}`, marginBottom: theme.spacing.xs },
                        tabLabel: { width: 'calc(100% - 50px)' },
                        tabRightSection: { marginLeft: 'auto' }
                    }}>
                    <Tabs.List>
                      <Tabs.Tab value={COURSE_HEADER_SECTION_ID}
                        rightSection={ <CompletionBadge data={currentCourse} sectionType="overall" /> }
                        style={activeTab === COURSE_HEADER_SECTION_ID ? { backgroundColor: theme.colors[theme.primaryColor][6], color: theme.white } : { backgroundColor: theme.colors.gray[1], color: theme.colors.gray[8] } }>
                        <Text size="xs" truncate>Overall</Text>
                      </Tabs.Tab>
                      <Divider my="xs" />
                      {(currentCourse.units || []).map((unit) => {
                        if (!unit || typeof unit.id !== 'string' || unit.id.trim() === '') return null;
                        const unitCompletion = calculateSectionCompletion(unit, 'unit');
                        const isUnitComplete = unitCompletion.percentage === 100;
                        let tabColorName = isUnitComplete ? 'green' : (unitCompletion.percentage > 0 ? 'yellow' : 'gray');
                        return (
                          <Tabs.Tab key={unit.id} value={unit.id}
                            style={ activeTab === unit.id ? { backgroundColor: theme.colors[tabColorName][6], color: theme.white } : { backgroundColor: theme.colors[tabColorName][1], color: theme.colors[tabColorName][8] } }
                            rightSection={
                                <Group gap={3} wrap="nowrap" style={{ display: 'flex', alignItems: 'center' }}>
                                    <CompletionBadge data={unit} sectionType="unit" />
                                    <ActionIcon
                                        component="div"
                                        size="xs"
                                        variant="transparent"
                                        color={activeTab === unit.id ? theme.white : theme.colors.red[6]}
                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); promptRemoveUnit(unit); }}
                                        title={`Remove ${unit.unitName || 'Unit'}`}
                                        style={{ height: '16px', width: '16px', marginLeft: theme.spacing.xs }}
                                    >
                                        <IconX size={12} stroke={1.5} />
                                    </ActionIcon>
                                </Group>
                            }>
                            <Text size="xs" truncate>{unit.unitName || 'Untitled Unit'}</Text>
                          </Tabs.Tab>
                        );
                      })}
                    </Tabs.List>
                  </Tabs>
                </ScrollArea>
                <Box p="md" pt={0}>
                    <Button onClick={handleAddUnit} leftSection={<IconPlus size={14} />} variant="light" fullWidth mt="sm"
                      disabled={!currentUser || (!currentCourse?.isApproved && !!currentCourse?.originalCourseId)}
                      title={!currentCourse?.isApproved && !!currentCourse?.originalCourseId ? "Cannot add units to a suggestion based on an existing course." : "Add Unit"}> Add Unit </Button>
                </Box>
              </Box>

              <Box style={{
                  flexGrow: 1,
                  height: '100%',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0, // <<< THE CRITICAL FIX
                  // Removed backgroundColor: 'rgba(0, 0, 255, 0.1)'
                }}
              >
                <CurriculumEditor ref={editorRef} key={editorKey} initialCourseData={currentCourse} onSave={handleSubmitChanges} courseId={selectedCourseId} isApprovedCourse={currentCourse.isApproved} isSuggestion={!currentCourse.isApproved && !!currentCourse.originalCourseId} />
              </Box>
            </Flex>
          )}
        </AppShell.Main>
      </AppShell>

      <Modal opened={deleteUnitModalOpened} onClose={() => { closeDeleteUnitModal(); setUnitToDelete(null); }} title={<Title order={4}>Confirm Delete Unit</Title>} centered size="sm" overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}>
        <Text>Are you sure you want to delete the unit: <Text span fw={700}>{unitToDelete?.unitName || 'this unit'}</Text>?</Text>
        <Text c="dimmed" size="sm">This change will be part of your current working copy. Submit changes to make it permanent for this version/suggestion.</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => { closeDeleteUnitModal(); setUnitToDelete(null); }}>Cancel</Button>
          <Button color="red" leftSection={<IconTrash size={16} />} onClick={confirmRemoveUnit}>Delete Unit</Button>
        </Group>
      </Modal>
    </>
  );
}

export default App;