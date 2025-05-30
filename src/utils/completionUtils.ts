// src/utils/completionUtils.ts
import { EMPTY_ARRAY_JSON_STRING } from './constants';
import { type JSONContent } from '@tiptap/core';
import type { Course, Unit } from '../types';

/**
 * Checks if a string representing Tiptap JSON content is effectively empty.
 */
export function isRichTextEmpty(jsonString: string | undefined | null): boolean {
  if (jsonString === null || jsonString === undefined) {
    return true;
  }
  // Handle simple empty string for plain text fields that might be passed here accidentally
  if (jsonString.trim() === "") return true;


  if (jsonString === EMPTY_ARRAY_JSON_STRING) {
    return true;
  }

  try {
    const doc = JSON.parse(jsonString) as JSONContent | JSONContent[];

    // Handle if jsonString is an array of nodes (e.g. from direct content push)
    if (Array.isArray(doc)) {
        if (doc.length === 0) return true;
        if (doc.length === 1) {
            const node = doc[0];
             if (node.type === 'paragraph' && (!node.content || node.content.length === 0 || (node.content.length === 1 && node.content[0].type === 'text' && (!node.content[0].text || node.content[0].text.trim() === '')))) {
                return true;
            }
        }
        return false; // Has multiple nodes or a non-empty paragraph
    }


    // Handle if jsonString is a Tiptap document object
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
    // If parsing fails, it's not valid Tiptap JSON.
    // If it was meant to be plain text, an empty string check would have caught it.
    // If it's non-empty unparsable text, consider it non-empty for completion.
    // However, for safety in calculation, if it's not parseable and NOT an empty string,
    // it might be corrupt data. Treating as empty for calculation safety might be an option,
    // or log and treat as non-empty if it's plain text.
    // Given the function name, if it's not empty AND not parseable, it's not "rich text empty".
    // Let's adjust to: if it's not an empty string and not parsable as empty JSON, it's "not empty".
    if (jsonString.trim() !== "") return false; // If it's not an empty string and fails to parse, it's not empty
    console.warn("Failed to parse JSON string in isRichTextEmpty, treating as empty due to parse error:", jsonString, error);
    return true; // Default to true on error if it's also an empty string
  }
}

// Define which fields contribute to completion
export const COURSE_LEVEL_RICH_TEXT_FIELDS_FOR_COMPLETION: (keyof Pick<Course, 'description' | 'biblicalBasis' | 'materials' | 'pacing'>)[] = [
  'description',
  'biblicalBasis',
  'materials',
  'pacing',
];

export const UNIT_LEVEL_RICH_TEXT_FIELDS_FOR_COMPLETION: (keyof Omit<Unit, 'id' | 'unitName' | 'timeAllotted'>)[] = [
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

  if (sectionType === 'overall' && data) {
    const courseData = data as Course;
    // Plain text fields for course
    totalFields++; // title
    if (courseData.title && courseData.title.trim() !== '') completedFields++;
    
    totalFields++; // department (Subject)
    if (courseData.department && courseData.department.trim() !== '') completedFields++;

    COURSE_LEVEL_RICH_TEXT_FIELDS_FOR_COMPLETION.forEach((field) => {
      totalFields++;
      if (!isRichTextEmpty(courseData[field])) {
        completedFields++;
      }
    });
  } else if (sectionType === 'unit' && data) {
    const unitData = data as Unit;
    // Plain text field for unit
    totalFields++; // unitName
    if (unitData.unitName && unitData.unitName.trim() !== '') completedFields++;
    
    // timeAllotted is plain text, optional for completion check or treat as required
    totalFields++; // timeAllotted (assuming it's required for completion)
    if (unitData.timeAllotted && unitData.timeAllotted.trim() !== '') completedFields++;


    UNIT_LEVEL_RICH_TEXT_FIELDS_FOR_COMPLETION.forEach((field) => {
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
    percentage: totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
  };
}