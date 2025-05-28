// src/components/CurriculumEditor/courseSerializer.ts
import { type JSONContent } from '@tiptap/core';
import type { Course, Unit } from '../../types';
import { EMPTY_RICH_TEXT_DATA, EMPTY_PLAIN_TEXT_DATA, EMPTY_PARAGRAPH_NODE_ARRAY } from '../../utils/constants';

export enum FieldType {
  PlainText = 'PlainText',
  RichText = 'RichText',
  EditableHeader = 'EditableHeader'
}

export const fieldConfig: Record<string, Record<string, { type: FieldType; label: string }>> = {
  course: {
    title: { type: FieldType.EditableHeader, label: "Course Title: " },
    name: { type: FieldType.EditableHeader, label: "Course Name/Code: " },
    description: { type: FieldType.RichText, label: "Description" },
    biblicalBasis: { type: FieldType.RichText, label: "Biblical Basis" },
    materials: { type: FieldType.RichText, label: "Materials" },
    pacing: { type: FieldType.RichText, label: "Pacing Guide" },
  },
  unit: {
    unitName: { type: FieldType.EditableHeader, label: "Unit Name: " },
    timeAllotted: { type: FieldType.PlainText, label: "Time Allotted" },
    learningObjectives: { type: FieldType.RichText, label: "Learning Objectives" },
    standards: { type: FieldType.RichText, label: "Standards" },
    biblicalIntegration: { type: FieldType.RichText, label: "Biblical Integration" },
    instructionalStrategiesActivities: { type: FieldType.RichText, label: "Instructional Strategies & Activities" },
    resources: { type: FieldType.RichText, label: "Resources" },
    assessments: { type: FieldType.RichText, label: "Assessments" },
  }
};

function createUnmodifiableHeaderNode(label: string, level: number, fieldKey: string): JSONContent {
  return { type: 'unmodifiableHeader', attrs: { label, level, fieldKey } };
}

function createEditableHeaderNode(staticLabel: string, initialValue: string | null | undefined, level: number, fieldKey: string): JSONContent {
  const contentNodes: JSONContent[] = (initialValue && initialValue.trim() !== '') ? [{ type: 'text', text: initialValue }] : [];
  return { type: 'editableHeader', attrs: { label: staticLabel, level, fieldKey }, content: contentNodes };
}

function createContentNodesForField(contentValue: string | null | undefined, fieldType: FieldType.PlainText | FieldType.RichText, fieldKeyForDebug: string): JSONContent[] {
  if (contentValue === null || contentValue === undefined || (typeof contentValue === 'string' && contentValue.trim() === '')) {
    return [...EMPTY_PARAGRAPH_NODE_ARRAY]; // Return a copy
  }
  if (fieldType === FieldType.RichText) {
    try {
      const parsedJson = JSON.parse(contentValue as string);
      if (Array.isArray(parsedJson) && parsedJson.length === 0) return [...EMPTY_PARAGRAPH_NODE_ARRAY];
      if (Array.isArray(parsedJson)) return parsedJson;
      if (parsedJson.type === 'doc' && Array.isArray(parsedJson.content)) {
        return parsedJson.content.length > 0 ? parsedJson.content : [...EMPTY_PARAGRAPH_NODE_ARRAY];
      }
      console.warn(`Field ${fieldKeyForDebug} (RichText) had unexpected JSON structure. Content:`, contentValue);
      return [{ type: 'paragraph', content: [{ type: 'text', text: String(contentValue) }] }];
    } catch (e) {
      console.warn(`Failed to parse rich text JSON for ${fieldKeyForDebug}. Error:`, e, `Content:`, contentValue);
      return [{ type: 'paragraph', content: [{ type: 'text', text: String(contentValue) }] }];
    }
  } else { // PlainText
    return [{ type: 'paragraph', content: [{ type: 'text', text: String(contentValue) }] }];
  }
}

export function courseToTiptapJson(course: Course): JSONContent {
  const content: JSONContent[] = [];
  const addSection = (fullFieldKey: string, value: string | null | undefined, config: { type: FieldType; label: string }, level: number) => {
    if (config.type === FieldType.EditableHeader) {
      content.push(createEditableHeaderNode(config.label, value, level, fullFieldKey));
    } else {
      content.push(createUnmodifiableHeaderNode(config.label, level, fullFieldKey));
      content.push(...createContentNodesForField(value, config.type as FieldType.PlainText | FieldType.RichText, `${fullFieldKey}.content`));
    }
  };

  addSection('course.title', course.title, fieldConfig.course.title, 1);
  addSection('course.name', course.name, fieldConfig.course.name, 2);
  addSection('course.description', course.description, fieldConfig.course.description, 2);
  addSection('course.biblicalBasis', course.biblicalBasis, fieldConfig.course.biblicalBasis, 2);
  addSection('course.materials', course.materials, fieldConfig.course.materials, 2);
  addSection('course.pacing', course.pacing, fieldConfig.course.pacing, 2);

  if (course.units && course.units.length > 0) {
    content.push(createUnmodifiableHeaderNode('Units Overview', 1, `course.unitsHeader`));
    course.units.forEach((unit, unitIndex) => {
      const unitBaseKey = `unit.${unitIndex}`;
      Object.keys(fieldConfig.unit).forEach(fieldNameKey => {
        const config = fieldConfig.unit[fieldNameKey];
        const unitFieldValue = unit[fieldNameKey as keyof Unit] as string | null | undefined; // Type assertion
        const fieldLevel = fieldNameKey === 'unitName' ? 2 : 3;
        addSection(`${unitBaseKey}.${fieldNameKey}`, unitFieldValue, config, fieldLevel);
      });
    });
  }
  return { type: 'doc', content };
}

function extractTextFromNodes(nodes: JSONContent[] | undefined): string {
  if (!nodes) return '';
  return nodes.map(node => {
    if (node.type === 'text' && typeof node.text === 'string') return node.text;
    if (node.content && Array.isArray(node.content)) return extractTextFromNodes(node.content);
    return '';
  }).join('');
}

export function tiptapJsonToCourse(tiptapJson: JSONContent, baseCourseData: Course): Course {
  const newCourse: Course = JSON.parse(JSON.stringify(baseCourseData));
  if (!newCourse.units) newCourse.units = [];

  const nodes = tiptapJson.content || [];
  let currentNodeIndex = 0;

  const getOrCreateUnit = (index: number): Unit => {
    while (newCourse.units.length <= index) {
      const defaultUnitName = `Unit ${newCourse.units.length + 1}`; // Temporary name
      newCourse.units.push({
        unitName: defaultUnitName, // Will be overwritten by EditableHeader's content
        timeAllotted: EMPTY_PLAIN_TEXT_DATA,
        learningObjectives: EMPTY_RICH_TEXT_DATA,
        standards: EMPTY_RICH_TEXT_DATA,
        biblicalIntegration: EMPTY_RICH_TEXT_DATA,
        instructionalStrategiesActivities: EMPTY_RICH_TEXT_DATA,
        resources: EMPTY_RICH_TEXT_DATA,
        assessments: EMPTY_RICH_TEXT_DATA,
      });
    }
    return newCourse.units[index];
  };

  while (currentNodeIndex < nodes.length) {
    const node = nodes[currentNodeIndex];
    const fieldKey = node.attrs?.fieldKey as string | undefined;

    if (!fieldKey || fieldKey === 'course.unitsHeader') { // Also skip structural headers
      currentNodeIndex++;
      continue;
    }

    const parts = fieldKey.split('.');
    const primaryType = parts[0];
    let objectFieldName: string; // e.g. 'title', 'unitName'
    let unitIndex = -1;
    let targetObject: any = null;
    let configForField: { type: FieldType; label: string } | undefined = undefined;

    if (primaryType === 'course') {
      objectFieldName = parts[1];
      configForField = fieldConfig.course[objectFieldName];
      if (configForField) targetObject = newCourse;
    } else if (primaryType === 'unit') {
      unitIndex = parseInt(parts[1], 10);
      objectFieldName = parts[2];
      configForField = fieldConfig.unit[objectFieldName];
      if (!isNaN(unitIndex) && configForField) targetObject = getOrCreateUnit(unitIndex);
    }

    if (!targetObject || !configForField) {
      console.warn("No target or config for fieldKey:", fieldKey);
      currentNodeIndex++;
      continue;
    }

    if (node.type === 'editableHeader' && configForField.type === FieldType.EditableHeader) {
      targetObject[objectFieldName] = extractTextFromNodes(node.content).trim();
      currentNodeIndex++;
    } else if (node.type === 'unmodifiableHeader' && (configForField.type === FieldType.PlainText || configForField.type === FieldType.RichText)) {
      currentNodeIndex++; // Move past the header
      const contentNodesForField: JSONContent[] = [];
      while (currentNodeIndex < nodes.length && (!nodes[currentNodeIndex].attrs?.fieldKey || (nodes[currentNodeIndex].type !== 'unmodifiableHeader' && nodes[currentNodeIndex].type !== 'editableHeader'))) {
        contentNodesForField.push(nodes[currentNodeIndex]);
        currentNodeIndex++;
      }
      if (configForField.type === FieldType.RichText) {
        targetObject[objectFieldName] = (contentNodesForField.length === 0 || (contentNodesForField.length === 1 && contentNodesForField[0].type === 'paragraph' && !contentNodesForField[0].content))
          ? EMPTY_RICH_TEXT_DATA
          : JSON.stringify(contentNodesForField);
      } else if (configForField.type === FieldType.PlainText) {
        const text = extractTextFromNodes(contentNodesForField).trim();
        targetObject[objectFieldName] = text === '' ? EMPTY_PLAIN_TEXT_DATA : text;
      }
    } else {
      // console.warn(`Node type/config mismatch for fieldKey: ${fieldKey}, nodeType: ${node.type}, configType: ${configForField?.type}`);
      currentNodeIndex++;
    }
  }
  return newCourse;
}