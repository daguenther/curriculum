// src/components/StatusBar/StatusBar.tsx
import React from 'react';
import { Paper, Text, Progress, useMantineTheme } from '@mantine/core';
import type { Course } from '../../types';
import { isRichTextEmpty } from '../../utils/completionUtils';

interface StatusBarProps {
  currentCourse: Course | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ currentCourse }) => {
  const theme = useMantineTheme();

  if (!currentCourse) {
    return null; // Or a placeholder like <Text c="dimmed">No course loaded.</Text>
  }

  const courseLevelFields: (keyof Pick<Course, 'description' | 'biblicalBasis' | 'materials' | 'pacing'>)[] = [
    'description',
    'biblicalBasis',
    'materials',
    'pacing',
  ];

  const unitLevelFields: (keyof Course['units'][0])[] = [
    'learningObjectives',
    'standards',
    'biblicalIntegration',
    'instructionalStrategiesActivities',
    'resources',
    'assessments',
  ];

  let totalSections = 0;
  let completedSections = 0;

  // Check course-level fields
  courseLevelFields.forEach((field) => {
    totalSections++;
    if (!isRichTextEmpty(currentCourse[field])) {
      completedSections++;
    }
  });

  // Check unit-level fields for each unit
  if (currentCourse.units && currentCourse.units.length > 0) {
    currentCourse.units.forEach((unit) => {
      unitLevelFields.forEach((field) => {
        totalSections++;
        // Ensure unit[field] is passed as string | undefined | null
        const fieldValue = unit[field] as string | undefined | null;
        if (!isRichTextEmpty(fieldValue)) {
          completedSections++;
        }
      });
      // Also consider unitName as a section (it's plain text, but important)
      // For plain text fields, empty means an empty string or null/undefined.
      // isRichTextEmpty isn't directly for plain text, so we'll do a direct check.
      totalSections++;
      if (unit.unitName && unit.unitName.trim() !== '') {
          completedSections++;
      }
    });
  }
  
  // Also consider course title and name as sections (plain text)
  totalSections++;
  if (currentCourse.title && currentCourse.title.trim() !== '') {
    completedSections++;
  }
  totalSections++;
  if (currentCourse.name && currentCourse.name.trim() !== '') {
    completedSections++;
  }


  let backgroundColor = theme.colors.gray[1]; // Neutral for totalSections === 0
  let textColor = theme.black;
  const progressValue = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;
  let progressColor = theme.colors.yellow[6];

  if (totalSections > 0) {
    if (completedSections === totalSections) {
      backgroundColor = theme.colors.green[1];
      textColor = theme.colors.green[8];
      progressColor = theme.colors.green[6];
    } else {
      backgroundColor = theme.colors.yellow[1];
      textColor = theme.colors.yellow[8];
    }
  }

  const sectionsRemaining = totalSections - completedSections;
  const statusText = sectionsRemaining > 0 
    ? `${sectionsRemaining} section(s) need attention.`
    : `All ${totalSections} sections look complete!`;

  return (
    <Paper p="sm" mb="md" style={{ backgroundColor }} shadow="xs">
      <Text c={textColor} fw={500} size="sm" mb={5}>{statusText}</Text>
      {totalSections > 0 && (
         <Progress value={progressValue} color={progressColor} striped animated={completedSections < totalSections} />
      )}
      <Text c="dimmed" size="xs" mt={3}>{completedSections} / {totalSections} sections considered complete.</Text>
    </Paper>
  );
};

export default StatusBar;
