// src/components/Layout/SidePanel.tsx
import React from 'react';
import {
  Box,
  Tabs,
  ScrollArea,
  Text,
  ActionIcon,
  Group,
  Button,
  useMantineTheme,
  // Divider, // Removed Divider
} from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import CompletionBadge from '../CurriculumEditor/CompletionBadge';
import type { Course, Unit } from '../../types';
import { calculateSectionCompletion } from '../../utils/completionUtils';
import type { User as FirebaseUser } from "firebase/auth";


interface SidePanelProps {
  currentCourse: Course | null;
  activeTab: string;
  setActiveTab: (value: string) => void;
  promptRemoveUnit: (unit: Unit) => void;
  handleAddUnit: () => void;
  COURSE_HEADER_SECTION_ID: string;
  currentUser: FirebaseUser | null;
}

const VERTICAL_TABS_WIDTH = 240;

const SidePanel: React.FC<SidePanelProps> = ({
  currentCourse,
  activeTab,
  setActiveTab,
  promptRemoveUnit,
  handleAddUnit,
  COURSE_HEADER_SECTION_ID,
  currentUser,
}) => {
  const theme = useMantineTheme();

  if (!currentCourse) { // Only render if there's a course selected for unit navigation
    return null;
  }

  return (
    <Box
      w={VERTICAL_TABS_WIDTH}
      style={{
        borderRight: `1px solid ${theme.colors.gray[3]}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Full height of its flex parent in App.Main
      }}
    >
      <ScrollArea style={{ flexGrow: 1 }} type="auto" p="md">
        <Tabs
          value={activeTab}
          onChange={(value) => { if (value) { setActiveTab(value); } }}
          orientation="vertical"
          variant="pills"
          styles={{
            list: { borderRight: 0 },
            tab: { width: '100%', justifyContent: 'flex-start', padding: `${theme.spacing.xs} ${theme.spacing.sm}`, marginBottom: theme.spacing.xs },
            tabLabel: { width: 'calc(100% - 50px)', textAlign: 'left' }, // Ensure label text aligns left
            tabRightSection: { marginLeft: 'auto' }
          }}
        >
          <Tabs.List>
            <Tabs.Tab
              value={COURSE_HEADER_SECTION_ID}
              rightSection={<CompletionBadge data={currentCourse} sectionType="overall" />}
              style={activeTab === COURSE_HEADER_SECTION_ID ? { backgroundColor: theme.colors[theme.primaryColor][6], color: theme.white } : { backgroundColor: theme.colors.gray[1], color: theme.colors.gray[8] }}
            >
              <Text size="xs" truncate>Overall</Text>
            </Tabs.Tab>
            {/* <Divider my="xs" /> REMOVED THIS LINE */}
            {(currentCourse.units || []).map((unit) => {
              if (!unit || typeof unit.id !== 'string' || unit.id.trim() === '') return null;
              const unitCompletion = calculateSectionCompletion(unit, 'unit');
              const isUnitComplete = unitCompletion.percentage === 100;
              let tabColorName = isUnitComplete ? 'green' : (unitCompletion.percentage > 0 ? 'yellow' : 'gray');
              const activeUnitStyle = activeTab === unit.id ? { backgroundColor: theme.colors[tabColorName][6], color: theme.white } : { backgroundColor: theme.colors[tabColorName][1], color: theme.colors[tabColorName][8] };

              return (
                <Tabs.Tab
                  key={unit.id}
                  value={unit.id}
                  style={activeUnitStyle}
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
                  }
                >
                  <Text size="xs" truncate>{unit.unitName || 'Untitled Unit'}</Text>
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>
      </ScrollArea>
      <Box p="md" pt={0} style={{ flexShrink: 0, borderTop: `1px solid ${theme.colors.gray[3]}` }}>
        <Button
          onClick={handleAddUnit}
          leftSection={<IconPlus size={14} />}
          variant="light"
          fullWidth
          mt="sm"
          disabled={!currentUser || (!currentCourse?.isApproved && !!currentCourse?.originalCourseId)}
          title={!currentCourse?.isApproved && !!currentCourse?.originalCourseId ? "Cannot add units to a suggestion based on an existing course." : "Add Unit"}
        >
          Add Unit
        </Button>
      </Box>
    </Box>
  );
};

export default SidePanel;