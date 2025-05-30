// src/components/CourseNavigationContent.tsx
import React from 'react';
import {
  Stack,
  Button,
  Text,
  NavLink,
  Menu,
  Box,
  useMantineTheme,
} from '@mantine/core';
import { IconPlus, IconFileText, IconBook } from '@tabler/icons-react';
import type { User as FirebaseUser } from "firebase/auth";
import type { CourseMetadata } from '../types';

export interface CourseNavigationContentProps {
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
}

const CourseNavigationContent: React.FC<CourseNavigationContentProps> = ({
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

export default CourseNavigationContent;