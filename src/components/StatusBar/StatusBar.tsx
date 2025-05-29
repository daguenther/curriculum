// src/components/StatusBar/StatusBar.tsx
import React from 'react';
import { Paper, Text, RingProgress, Box, Group, useMantineTheme, Flex } from '@mantine/core';
import type { Course } from '../../types';
import { isRichTextEmpty } from '../../utils/completionUtils';

interface StatusBarProps {
  currentCourse: Course | null;
}

const StatusBar: React.FC<StatusBarProps> = ({ currentCourse }) => {
  const theme = useMantineTheme();

  if (!currentCourse) {
    return null; 
  }

  // Define fields for overall course progress
  const courseLevelRichTextFields: (keyof Pick<Course, 'description' | 'biblicalBasis' | 'materials' | 'pacing'>)[] = [
    'description',
    'biblicalBasis',
    'materials',
    'pacing',
  ];
  const courseLevelPlainTextFields: (keyof Pick<Course, 'title' | 'name'>)[] = ['title', 'name'];

  // Define fields for unit-specific progress
  const unitLevelRichTextFields: (keyof Pick<Course['units'][0], 'learningObjectives' | 'standards' | 'biblicalIntegration' | 'instructionalStrategiesActivities' | 'resources' | 'assessments'>)[] = [
    'learningObjectives',
    'standards',
    'biblicalIntegration',
    'instructionalStrategiesActivities',
    'resources',
    'assessments',
  ];
  const unitLevelPlainTextFields: (keyof Pick<Course['units'][0], 'unitName'>)[] = ['unitName'];


  const getProgressColor = (value: number): string => {
    if (value === 0) return theme.colors.gray[4];
    if (value === 100) return theme.colors.green[6];
    return theme.colors.yellow[6];
  };

  // Calculate overall course progress
  let overallCompleted = 0;
  const overallTotal = courseLevelRichTextFields.length + courseLevelPlainTextFields.length;

  courseLevelRichTextFields.forEach((field) => {
    if (!isRichTextEmpty(currentCourse[field])) {
      overallCompleted++;
    }
  });
  courseLevelPlainTextFields.forEach((field) => {
    const value = currentCourse[field];
    if (value && typeof value === 'string' && value.trim() !== '') {
      overallCompleted++;
    }
  });
  const overallProgressValue = overallTotal > 0 ? (overallCompleted / overallTotal) * 100 : 0;


  // Calculate unit-specific progress
  const unitProgressList = currentCourse.units?.map(unit => {
    let unitCompleted = 0;
    const unitTotal = unitLevelRichTextFields.length + unitLevelPlainTextFields.length;

    unitLevelRichTextFields.forEach(field => {
      const fieldValue = unit[field] as string | undefined | null;
      if (!isRichTextEmpty(fieldValue)) {
        unitCompleted++;
      }
    });
    unitLevelPlainTextFields.forEach(field => {
      const value = unit[field];
      if (value && typeof value === 'string' && value.trim() !== '') {
        unitCompleted++;
      }
    });
    const unitProgressValue = unitTotal > 0 ? (unitCompleted / unitTotal) * 100 : 0;
    return {
      name: unit.unitName || 'Unnamed Unit',
      value: unitProgressValue,
      completed: unitCompleted,
      total: unitTotal,
    };
  });

  return (
    <Paper p="md" mb="md" shadow="xs" radius="md">
      <Box mb="lg">
        <Text size="lg" fw={700} ta="center" mb="sm">Overall Course Progress</Text>
        <Flex direction="column" align="center">
          <RingProgress
            size={150}
            thickness={12}
            roundCaps
            sections={[{ value: overallProgressValue, color: getProgressColor(overallProgressValue) }]}
            label={
              <Text c={getProgressColor(overallProgressValue)} fw={700} ta="center" size="xl">
                {Math.round(overallProgressValue)}%
              </Text>
            }
          />
          <Text size="sm" c="dimmed" mt="xs">
            {overallCompleted} / {overallTotal} sections complete
          </Text>
        </Flex>
      </Box>

      {unitProgressList && unitProgressList.length > 0 && (
        <Box mt="xl">
          <Text size="lg" fw={700} ta="center" mb="md">Unit Progress</Text>
          <Group justify="center" gap="lg">
            {unitProgressList.map((unitProg, index) => (
              <Flex key={index} direction="column" align="center" gap="xs">
                <RingProgress
                  size={100}
                  thickness={8}
                  roundCaps
                  sections={[{ value: unitProg.value, color: getProgressColor(unitProg.value) }]}
                  label={
                    <Text c={getProgressColor(unitProg.value)} fw={700} ta="center" size="md">
                      {Math.round(unitProg.value)}%
                    </Text>
                  }
                />
                <Text ta="center" size="sm" style={{ maxWidth: 100 }}>{unitProg.name}</Text>
                 <Text size="xs" c="dimmed">
                    {unitProg.completed} / {unitProg.total}
                </Text>
              </Flex>
            ))}
          </Group>
        </Box>
      )}
    </Paper>
  );
};

export default StatusBar;
