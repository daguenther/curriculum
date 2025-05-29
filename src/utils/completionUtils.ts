// src/utils/completionUtils.ts
import { EMPTY_ARRAY_JSON_STRING } from './constants'; // Assuming this is defined elsewhere or define it here
import { type JSONContent } from '@tiptap/core';
import type { Course, Unit } from '../types'; // Make sure Unit is exported from types

/**
 * Checks if a string representing Tiptap JSON content is effectively empty.
 * (Keep your existing isRichTextEmpty function as is)
 */
export function isRichTextEmpty(jsonString: string | undefined | null): boolean {
  if (jsonString === null || jsonString === undefined) {
    return true;
  }

  if (jsonString === EMPTY_ARRAY_JSON_STRING) {
    return true;
  }

  try {
    const doc = JSON.parse(jsonString) as JSONContent;

    if (!doc || !doc.content || doc.content.length === 0) {
      return true;
    }

    if (doc.content.length === 1) {
      const node = doc.content[0];
      if (node.type === 'paragraph') {
        if (!node.content || node.content.length === 0) {
          return true;
        }
        if (
          node.content.length === 1 &&
          node.content[0].type === 'text' &&
          (!node.content[0].text || node.content[0].text.trim() === '')
        ) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.warn("Failed to parse JSON string in isRichTextEmpty, treating as empty:", jsonString, error);
    return true;
  }
}

// Define which fields contribute to completion
export const COURSE_LEVEL_FIELDS_FOR_COMPLETION: (keyof Pick<Course, 'description' | 'biblicalBasis' | 'materials' | 'pacing'>)[] = [
  'description',
  'biblicalBasis',
  'materials',
  'pacing',
];

export const UNIT_LEVEL_FIELDS_FOR_COMPLETION: (keyof Omit<Unit, 'id' | 'unitName' | 'timeAllotted'>)[] = [
  'learningObjectives',
  'standards',
  'biblicalIntegration',
  'instructionalStrategiesActivities',
  'resources',
  'assessments',
];

export function calculateSectionCompletion(
  data: Course | Unit,
  sectionType: 'overall' | 'unit'
): { completed: number; total: number; percentage: number } {
  let totalFields = 0;
  let completedFields = 0;

  if (sectionType === 'overall') {
    const courseData = data as Course;
    // Plain text fields for course
    totalFields++; // title
    if (courseData.title && courseData.title.trim() !== '') completedFields++;
    totalFields++; // name
    if (courseData.name && courseData.name.trim() !== '') completedFields++;

    COURSE_LEVEL_FIELDS_FOR_COMPLETION.forEach((field) => {
      totalFields++;
      if (!isRichTextEmpty(courseData[field])) {
        completedFields++;
      }
    });
  } else if (sectionType === 'unit') {
    const unitData = data as Unit;
    // Plain text field for unit
    totalFields++; // unitName
    if (unitData.unitName && unitData.unitName.trim() !== '') completedFields++;
    // timeAllotted is optional and might not be part of completion metric, or handle as plain text
    // totalFields++; // timeAllotted
    // if (unitData.timeAllotted && unitData.timeAllotted.trim() !== '') completedFields++;


    UNIT_LEVEL_FIELDS_FOR_COMPLETION.forEach((field) => {
      totalFields++;
      const fieldValue = unitData[field] as string | undefined | null;
      if (!isRichTextEmpty(fieldValue)) {
        completedFields++;
      }
    });
  }

  return {
    completed: completedFields,
    total: totalFields,
    percentage: totalFields > 0 ? (completedFields / totalFields) * 100 : 0,
  };
}