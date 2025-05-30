import React from 'react';
import { Badge } from '@mantine/core';
import { IconCheck, IconFileAlert } from '@tabler/icons-react';
import { calculateSectionCompletion } from '../../utils/completionUtils';
import type { Course, Unit } from '../../types';

interface CompletionBadgeProps {
  data: Course | Unit | null;
  sectionType: 'overall' | 'unit';
}

const CompletionBadge: React.FC<CompletionBadgeProps> = ({ data, sectionType }) => {
  if (!data) return null;

  const { completed, total, percentage } = calculateSectionCompletion(data, sectionType);

  // If total is 0, and it's for overall, show 0%. For unit, might show nothing or 0%.
  if (total === 0) {
    return (
        <Badge color="gray" variant="light" size="xs" radius="sm" ml="xs">
            {sectionType === 'overall' ? `0% (0/0)` : `0%`}
        </Badge>
    );
  }

  const isComplete = percentage === 100;
  const badgeColor = isComplete ? 'green' : (percentage > 0 ? 'yellow' : 'gray');
  const badgeIcon = isComplete ? <IconCheck size={12} stroke={1.5} /> : (percentage > 0 ? <IconFileAlert size={12} stroke={1.5}/> : null);

  return (
    <Badge
      color={badgeColor}
      variant="light"
      leftSection={badgeIcon}
      size="xs"
      radius="sm"
      ml="xs"
    >
      {percentage.toFixed(0)}%
      {sectionType === 'overall' && ` (${completed}/${total})`}
    </Badge>
  );
};

export default CompletionBadge;