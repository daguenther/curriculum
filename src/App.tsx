// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppShell,
  LoadingOverlay,
  Alert,
  Modal,
  Group,
  Button,
  Title,
  Text,
  Flex,
  ScrollArea,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconCheck,
  IconTrash,
} from '@tabler/icons-react';
import type { User as FirebaseUser } from "firebase/auth";

import TopPanel from './components/Layout/TopPanel';
import SidePanel from './components/Layout/SidePanel';
import EditorPanel from './components/Layout/EditorPanel';
import CourseNavigationContent from './components/CourseNavigationContent';

import type { CurriculumEditorRef } from './components/CurriculumEditor/CurriculumEditor';
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
import { notifications } from '@mantine/notifications';

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
    if (currentCourse && activeTab && editorRef.current) {
        const timeoutId = setTimeout(() => {
            if (editorRef.current && typeof editorRef.current.scrollToSection === 'function') {
                editorRef.current.scrollToSection(activeTab);
            }
        }, 250);
        return () => clearTimeout(timeoutId);
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
    if (!currentUser) {
        notifications.show({ title: 'Login Required', message: 'Please log in to load a course.', color: 'yellow' });
        return;
    }
    if (!courseId) {
      setCurrentCourse(null); setSelectedCourseId(null); setEditorKey(prev => prev + 1); setActiveTab(COURSE_HEADER_SECTION_ID);
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
          if (isMobile) closeMobileNavbar();
          else closeDesktopMenu();
      } else {
        setError(`Course with ID ${courseId} not found.`);
        notifications.show({ title: 'Error', message: `Course with ID ${courseId} not found.`, color: 'red' });
        setCurrentCourse(null); setSelectedCourseId(null); setActiveTab(COURSE_HEADER_SECTION_ID);
      }
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
      setError(`Failed to load course: ${errorMessage}`);
      notifications.show({ title: 'Error', message: `Failed to load course: ${errorMessage}`, color: 'red' });
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
        setError(msg); notifications.show({ title: 'Error', message: msg, color: 'red' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddUnit = () => {
    if (!currentCourse || !currentUser) return;
    if (!currentCourse.isApproved && currentCourse.originalCourseId) {
        notifications.show({ title: 'Action Denied', message: 'Adding units is disabled for suggestions. Edit the main course or create a new one.', color: 'orange'}); return;
    }
    const newUnitId = `unit_${crypto.randomUUID()}`;
    const newUnit: Unit = {
      id: newUnitId, unitName: `New Unit ${ (currentCourse.units?.length || 0) + 1}`, timeAllotted: "Specify time",
      learningObjectives: EMPTY_ARRAY_JSON_STRING, standards: EMPTY_ARRAY_JSON_STRING, biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
      instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING, resources: EMPTY_ARRAY_JSON_STRING, assessments: EMPTY_ARRAY_JSON_STRING,
    };
    const updatedCourseWithNewUnit = { ...currentCourse, units: [...(currentCourse.units || []), newUnit] };
    setCurrentCourse(updatedCourseWithNewUnit);
    setEditorKey(prev => prev + 1);
    setActiveTab(newUnitId);
  };

  const promptRemoveUnit = (unit: Unit) => {
    if (!currentCourse?.isApproved && currentCourse?.originalCourseId) {
         notifications.show({ title: 'Action Denied', message: 'Removing units is disabled for suggestions.', color: 'orange'}); return;
    }
    setUnitToDelete(unit); openDeleteUnitModal();
  };

  const confirmRemoveUnit = () => {
    if (!currentCourse || !unitToDelete || !currentUser) return;
    const newUnits = (currentCourse.units || []).filter(u => u.id !== unitToDelete.id);
    const updatedCourseWithoutUnit = { ...currentCourse, units: newUnits };
    setCurrentCourse(updatedCourseWithoutUnit);
    setEditorKey(prev => prev + 1);
    if (activeTab === unitToDelete.id) {
      setActiveTab(COURSE_HEADER_SECTION_ID);
    }
    closeDeleteUnitModal(); setUnitToDelete(null);
  };

  useEffect(() => {
    if (currentCourse && activeTab !== COURSE_HEADER_SECTION_ID) {
      if (!(currentCourse.units || []).some(unit => unit.id === activeTab)) {
        setActiveTab(COURSE_HEADER_SECTION_ID);
      }
    } else if (!currentCourse && activeTab !== COURSE_HEADER_SECTION_ID) {
      setActiveTab(COURSE_HEADER_SECTION_ID);
    }
  }, [currentCourse, activeTab]);

  const HEADER_HEIGHT = 60;

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
        <TopPanel
          mobileOpened={mobileOpened}
          toggleMobile={toggleMobile}
          desktopMenuOpened={desktopMenuOpened}
          toggleDesktopMenu={toggleDesktopMenu}
          closeDesktopMenu={closeDesktopMenu}
          currentUser={currentUser}
          courseNavSharedProps={courseNavSharedProps}
          currentCourse={currentCourse}
          signOutUser={signOutUser}
          signInWithGoogle={signInWithGoogle}
          isMobile={isMobile}
        />

        <AppShell.Navbar p={0}>
             <ScrollArea style={{ height: '100%' }}>
                <CourseNavigationContent {...courseNavSharedProps} renderAs="navlink" closeMenu={closeMobileNavbar} />
            </ScrollArea>
        </AppShell.Navbar>

        <AppShell.Main style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)`, overflow: 'hidden' }}>
          <LoadingOverlay visible={isLoading && !authLoading} overlayProps={{ radius: 'sm', blur: 2 }} />
          {error && ( <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" withCloseButton onClose={() => setError(null)} m="md">{error}</Alert> )}

          <Flex style={{ height: '100%', width: '100%' }}>
            {currentUser && currentCourse && selectedCourseId && ( // Only show SidePanel (unit tabs) if a course is loaded
                <SidePanel
                    currentCourse={currentCourse}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    promptRemoveUnit={promptRemoveUnit}
                    handleAddUnit={handleAddUnit}
                    COURSE_HEADER_SECTION_ID={COURSE_HEADER_SECTION_ID}
                    currentUser={currentUser}
                />
            )}
            <EditorPanel
                editorRef={editorRef}
                editorKey={editorKey}
                currentCourse={currentCourse}
                handleSubmitChanges={handleSubmitChanges}
                selectedCourseId={selectedCourseId}
                currentUser={currentUser}
                signInWithGoogle={signInWithGoogle}
                coursesMetadata={coursesMetadata}
                isLoading={isLoading}
                authLoading={authLoading}
            />
          </Flex>
        </AppShell.Main>
      </AppShell>

      <Modal
        opened={deleteUnitModalOpened}
        onClose={() => { closeDeleteUnitModal(); setUnitToDelete(null); }}
        title={<Title order={4}>Confirm Delete Unit</Title>}
        centered
        size="sm"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      >
        <Text>Are you sure you want to delete the unit: <Text span fw={700}>{unitToDelete?.unitName || 'this unit'}</Text>?</Text>
        <Text c="dimmed" size="sm">This change will be part of your current working copy. Submit changes to make it permanent.</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => { closeDeleteUnitModal(); setUnitToDelete(null); }}>Cancel</Button>
          <Button color="red" leftSection={<IconTrash size={16} />} onClick={confirmRemoveUnit}>Delete Unit</Button>
        </Group>
      </Modal>
    </>
  );
}

export default App;