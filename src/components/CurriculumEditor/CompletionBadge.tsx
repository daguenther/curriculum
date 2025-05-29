import React from 'react';
import { Badge } from '@mantine/core';
import { IconCheck, IconFileAlert } from '@tabler/icons-react';
import { calculateSectionCompletion } from '../../utils/completionUtils';
import type { Course, Unit } from '../../types';

interface CompletionBadgeProps {
  data: Course | Unit;
  sectionType: 'overall' | 'unit';
}

const CompletionBadge: React.FC<CompletionBadgeProps> = ({ data, sectionType }) => {
  // Ensure data is not null/undefined before calculating
  if (!data) return null;

  const { completed, total, percentage } = calculateSectionCompletion(data, sectionType);

  if (total === 0) return null;

  const isComplete = percentage === 100;

  return (
    <Badge
      color={isComplete ? 'green' : 'yellow'}
      variant="light"
      leftSection={isComplete ? <IconCheck size={12} stroke={1.5} /> : <IconFileAlert size={12} stroke={1.5} />}
      size="sm"
      radius="sm"
      ml="xs" // Add some margin if it's inside the tab label
    >
      {completed}/{total}
    </Badge>
  );
};

export default CompletionBadge;