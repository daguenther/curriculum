// src/components/StatusBar/StatusBar.tsx
import React from 'react';
import { Paper, Text, Progress, useMantineTheme } from '@mantine/core';
import type { Course } // Unit removed as we don't pass unit directly
from '../../types';
import { isRichTextEmpty } from '../../utils/completionUtils';

interface StatusBarProps {
  currentCourse: Course | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ currentCourse }) => {
  const theme = useMantineTheme();

  if (!currentCourse) {
    return null;
  }

  // Fields to check for overall course completion for the status bar
  // This is a client-side calculation for this component's display.
  // The authoritative `progress` is on the Course object from Firebase.
  
  let totalSections = 0;
  let completedSections = 0;

  // Course Title
  totalSections++;
  if (currentCourse.title && currentCourse.title.trim() !== '') {
    completedSections++;
  }
  // Course Subject (Department)
  totalSections++;
  if (currentCourse.department && currentCourse.department.trim() !== '') {
    completedSections++;
  }

  // Course-level rich text fields
  const courseRichTextFields: (keyof Pick<Course, 'description' | 'biblicalBasis' | 'materials' | 'pacing'>)[] = [
    'description',
    'biblicalBasis',
    'materials',
    'pacing',
  ];
  courseRichTextFields.forEach((field) => {
    totalSections++;
    if (!isRichTextEmpty(currentCourse[field])) {
      completedSections++;
    }
  });

  // Unit-level fields for each unit
  const unitRichTextFields: (keyof Omit<Course['units'][0], 'id' | 'unitName' | 'timeAllotted'>)[] = [
    'learningObjectives',
    'standards',
    'biblicalIntegration',
    'instructionalStrategiesActivities',
    'resources',
    'assessments',
  ];

  if (currentCourse.units && currentCourse.units.length > 0) {
    currentCourse.units.forEach((unit) => {
      // Unit Name (plain text)
      totalSections++;
      if (unit.unitName && unit.unitName.trim() !== '') {
          completedSections++;
      }
      // Unit Time Allotted (plain text)
      totalSections++;
      if (unit.timeAllotted && unit.timeAllotted.trim() !== '') {
          completedSections++;
      }

      unitRichTextFields.forEach((field) => {
        totalSections++;
        const fieldValue = unit[field] as string | undefined | null;
        if (!isRichTextEmpty(fieldValue)) {
          completedSections++;
        }
      });
    });
  }

  let backgroundColor = theme.colors.gray[1];
  let textColor = theme.black;
  const progressValue = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;
  let progressColor = theme.colors.yellow[6];

  if (totalSections > 0) {
    if (progressValue === 100) {
      backgroundColor = theme.colors.green[1];
      textColor = theme.colors.green[8];
      progressColor = theme.colors.green[6];
    } else if (progressValue > 0) {
      backgroundColor = theme.colors.yellow[1];
      textColor = theme.colors.yellow[8];
    }
  }

  const sectionsRemaining = totalSections - completedSections;
  const statusText = sectionsRemaining > 0 
    ? `${sectionsRemaining} section(s) need attention.`
    : (totalSections > 0 ? `All ${totalSections} sections look complete!` : `Course is empty.`);


  return (
    <Paper p="sm" mb="md" style={{ backgroundColor }} shadow="xs">
      <Text c={textColor} fw={500} size="sm" mb={5}>{statusText}</Text>
      {totalSections > 0 && (
         <Progress value={progressValue} color={progressColor} striped animated={completedSections < totalSections} />
      )}
      <Text c="dimmed" size="xs" mt={3}>{completedSections} / {totalSections} sections considered complete by this component.</Text>
    </Paper>
  );
};

export default StatusBar;