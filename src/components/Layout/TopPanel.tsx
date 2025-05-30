// src/components/Layout/TopPanel.tsx
import React from 'react';
import {
  AppShell,
  Burger,
  Group,
  Title,
  Button,
  Menu,
  Avatar,
  Badge,
  Box,
  Text,
  ScrollArea,
} from '@mantine/core';
import {
  IconLogout,
  IconUserCircle,
  IconLayoutSidebarLeftExpand,
  IconLogin,
} from '@tabler/icons-react';
import type { User as FirebaseUser } from "firebase/auth";
import CourseNavigationContent, { type CourseNavigationContentProps } from '../CourseNavigationContent';
import type { Course } from '../../types';

interface TopPanelProps {
  mobileOpened: boolean;
  toggleMobile: () => void;
  desktopMenuOpened: boolean;
  toggleDesktopMenu: () => void; // For Menu's onChange and target click
  closeDesktopMenu: () => void; // For closing after item click
  currentUser: FirebaseUser | null;
  courseNavSharedProps: Omit<CourseNavigationContentProps, 'renderAs' | 'closeMenu'>;
  currentCourse: Course | null;
  signOutUser: () => void;
  signInWithGoogle: () => void;
  isMobile: boolean;
}

const TopPanel: React.FC<TopPanelProps> = ({
  mobileOpened,
  toggleMobile,
  desktopMenuOpened,
  toggleDesktopMenu,
  closeDesktopMenu,
  currentUser,
  courseNavSharedProps,
  currentCourse,
  signOutUser,
  signInWithGoogle,
  isMobile,
}) => {
  return (
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between" wrap="nowrap">
        <Group gap="xs" align="center">
          <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
          <Box visibleFrom="sm">
            <Menu
              opened={desktopMenuOpened}
              onChange={toggleDesktopMenu} // This will be called when menu wants to change state (e.g. click outside)
              shadow="md" width={300} trigger="click" // Target click will also use toggle implicitly via Menu's own logic or onChange
              position="bottom-start"
              closeOnClickOutside={true}
            >
              <Menu.Target>
                <Button
                  variant="subtle"
                  size="sm"
                  leftSection={<IconLayoutSidebarLeftExpand size="1.2rem" />}
                  px="xs"
                  onClick={toggleDesktopMenu} // Explicitly toggle on button click
                >
                  Courses
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <ScrollArea style={{ maxHeight: 'calc(100vh - 120px)', paddingRight: '10px' }}>
                  <CourseNavigationContent
                    {...courseNavSharedProps}
                    renderAs="menuitem"
                    closeMenu={closeDesktopMenu}
                  />
                </ScrollArea>
              </Menu.Dropdown>
            </Menu>
          </Box>
          <Title order={3} ml={isMobile ? 0 : "xs"}>Curriculum Mapper</Title>
          {currentCourse && (
            <>
              <Text size="lg" c="dimmed" visibleFrom="sm">|</Text>
              <Text size="lg" fw={500} truncate style={{ whiteSpace: 'nowrap', maxWidth: isMobile ? '100px' : '180px' }}>
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
                <Button variant="subtle" size="sm" leftSection={currentUser.photoURL ? <Avatar src={currentUser.photoURL} alt="User" radius="xl" size="sm" /> : <IconUserCircle size="1.2rem" />}>
                  <Text size="sm" truncate maw={100}>{currentUser.displayName || currentUser.email}</Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{currentUser.email}</Menu.Label>
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={signOutUser}>Logout</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Button onClick={signInWithGoogle} leftSection={<IconLogin size="1rem" />} variant="outline" size="sm">Login with Google</Button>
          )}
        </Group>
      </Group>
    </AppShell.Header>
  );
};

export default TopPanel;