// src/components/CurriculumEditor/courseSerializer.ts
import { type JSONContent } from '@tiptap/react';
import { type Course, type Unit } from '../../types';
import { EMPTY_ARRAY_JSON_STRING, EMPTY_TIPTAP_DOCUMENT_JSON } from '../../utils/constants'; // Use constants

export const COURSE_HEADER_SECTION_ID = 'course-overview-header';

export enum FieldType {
  EditableHeader = 'editableHeader',
  RichText = 'richText',
  PlainText = 'plainText', // For fields like 'timeAllotted'
}

export interface FieldConfigItem {
  label: string;
  type: FieldType;
  defaultLevel?: number;
  isSectionHeader?: boolean;
}

export const fieldConfig = {
  course: {
    title: { label: 'Course Title:', type: FieldType.EditableHeader, defaultLevel: 1, isSectionHeader: true } as FieldConfigItem,
    department: { label: 'Subject:', type: FieldType.EditableHeader, defaultLevel: 3, isSectionHeader: false } as FieldConfigItem, // Changed from 'name' to 'department' and relabeled
    description: { label: 'Description', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    biblicalBasis: { label: 'Biblical Basis', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    materials: { label: 'Materials', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    pacing: { label: 'Pacing', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
  } as Record<keyof Omit<Course, 'id' | 'units' | 'progress' /* 'name' was already implicitly excluded by Omit */>, FieldConfigItem>, // Exclude progress
  unit: {
    unitName: { label: 'Unit Name:', type: FieldType.EditableHeader, defaultLevel: 2, isSectionHeader: true } as FieldConfigItem,
    timeAllotted: { label: 'Time Allotted:', type: FieldType.PlainText, isSectionHeader: false } as FieldConfigItem, // Retain as PlainText for now
    learningObjectives: { label: 'Learning Objectives', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    standards: { label: 'Standards', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    biblicalIntegration: { label: 'Biblical Integration', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    instructionalStrategiesActivities: { label: 'Instructional Strategies & Activities', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    resources: { label: 'Resources', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    assessments: { label: 'Assessments', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
  } as Record<keyof Omit<Unit, 'id'>, FieldConfigItem>,
};


export function courseToTiptapJson(course: Course): JSONContent {
  const content: JSONContent[] = [];

  // --- COURSE LEVEL FIELDS ---
  const courseTitleText = course.title || '';
  content.push({
    type: 'editableHeader',
    attrs: {
      level: fieldConfig.course.title.defaultLevel || 1,
      label: fieldConfig.course.title.label,
      fieldKey: 'course.title',
      sectionId: COURSE_HEADER_SECTION_ID,
    },
    content: courseTitleText ? [{ type: 'text', text: courseTitleText }] : [],
  });

  // Subject (formerly department)
  const courseSubjectText = course.department || '';
  content.push({
    type: 'editableHeader',
    attrs: {
      level: fieldConfig.course.department.defaultLevel || 3,
      label: fieldConfig.course.department.label,
      fieldKey: 'course.department',
    },
    content: courseSubjectText ? [{ type: 'text', text: courseSubjectText }] : [],
  });


  const addCourseRichTextSection = (
    fieldKey: keyof Pick<Course, 'description' | 'biblicalBasis' | 'materials' | 'pacing'>, // Ensure keys are valid
    data: string | undefined | null
  ) => {
    const config = fieldConfig.course[fieldKey];
    if (!config) {
        console.warn(`No fieldConfig for course field: ${String(fieldKey)}`);
        return;
    }
    content.push({
      type: 'unmodifiableHeader',
      attrs: { level: 2, label: config.label, fieldKey: `course.${String(fieldKey)}.header` },
    });

    try {
      const jsonData = JSON.parse(data || EMPTY_ARRAY_JSON_STRING);
      if (jsonData.type === 'doc' && Array.isArray(jsonData.content) && jsonData.content.length > 0) {
        content.push(...jsonData.content);
      } else if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData.every(n => n.type)) { // Check if it's an array of nodes
        content.push(...jsonData);
      } else if (jsonData.type && jsonData.content) { // Single node object
        content.push(jsonData);
      } else { // Fallback for truly empty or unparseable as array of nodes
        content.push({ type: 'paragraph' });
      }
    } catch (e) {
      console.warn(`Failed to parse JSON for course field ${String(fieldKey)}, adding empty paragraph. Data:`, data, "Error:", e);
      const fallbackText = (typeof data === 'string' && data.trim() !== '' && data.trim() !== EMPTY_ARRAY_JSON_STRING) ? data : '';
      content.push({ type: 'paragraph', content: fallbackText ? [{ type: 'text', text: fallbackText }] : [] });
    }
  };

  addCourseRichTextSection('description', course.description);
  addCourseRichTextSection('biblicalBasis', course.biblicalBasis);
  addCourseRichTextSection('materials', course.materials);
  addCourseRichTextSection('pacing', course.pacing);


  // --- UNITS ---
  (course.units || []).forEach((unit) => {
    if (!unit.id) {
      console.warn("Skipping unit with no ID:", unit);
      return;
    }
    const unitNameText = unit.unitName || '';
    content.push({
      type: 'editableHeader',
      attrs: {
        level: fieldConfig.unit.unitName.defaultLevel || 2,
        label: fieldConfig.unit.unitName.label,
        fieldKey: `unit.${unit.id}.unitName`,
        sectionId: unit.id,
      },
      content: unitNameText ? [{ type: 'text', text: unitNameText }] : [],
    });

    // Time Allotted (Plain Text)
    const timeAllottedConfig = fieldConfig.unit.timeAllotted;
    content.push({
        type: 'unmodifiableHeader',
        attrs: { level: 3, label: timeAllottedConfig.label, fieldKey: `unit.${unit.id}.timeAllotted.header` },
    });
    const timeAllottedText = unit.timeAllotted || '';
    // Make timeAllotted editable in a paragraph directly after its unmodifiableHeader
    content.push({
        type: 'paragraph',
        // Add a specific fieldKey for this content to identify it during parsing
        attrs: { fieldKeyForPlainText: `unit.${unit.id}.timeAllotted` }, // Special attr for plain text
        content: timeAllottedText ? [{ type: 'text', text: timeAllottedText }] : [],
    });


    const unitRichTextFieldKeys: Array<keyof Omit<Unit, 'id' | 'unitName' | 'timeAllotted'>> = [
      'learningObjectives', 'standards', 'biblicalIntegration',
      'instructionalStrategiesActivities', 'resources', 'assessments'
    ];

    unitRichTextFieldKeys.forEach(fieldKey => {
      const config = fieldConfig.unit[fieldKey];
      const unitData = unit[fieldKey] as string | undefined | null;

      if (config && config.type === FieldType.RichText) {
        content.push({
          type: 'unmodifiableHeader',
          attrs: { level: 3, label: config.label, fieldKey: `unit.${unit.id}.${String(fieldKey)}.header` },
        });
        try {
          const jsonData = JSON.parse(unitData || EMPTY_ARRAY_JSON_STRING);
          if (jsonData.type === 'doc' && Array.isArray(jsonData.content) && jsonData.content.length > 0) {
            content.push(...jsonData.content);
          } else if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData.every(n => n.type)) {
            content.push(...jsonData);
          } else if (jsonData.type && jsonData.content){
             content.push(jsonData);
          } else {
            content.push({ type: 'paragraph' });
          }
        } catch (e) {
          console.warn(`Failed to parse JSON for unit ${unit.id} field ${String(fieldKey)}, adding empty paragraph. Data:`, unitData, "Error:", e);
          const fallbackText = (typeof unitData === 'string' && unitData.trim() !== '' && unitData.trim() !== EMPTY_ARRAY_JSON_STRING) ? unitData : '';
          content.push({ type: 'paragraph', content: fallbackText ? [{ type: 'text', text: fallbackText }] : [] });
        }
      }
    });
  });

  return { type: 'doc', content };
}


export function tiptapJsonToCourse(json: JSONContent, originalCourse: Course): Course {
  const newCourse: Course = {
    ...originalCourse,
    title: '',
    department: originalCourse.department || 'Uncategorized', // Initialize with original or default
    description: EMPTY_ARRAY_JSON_STRING,
    biblicalBasis: EMPTY_ARRAY_JSON_STRING,
    materials: EMPTY_ARRAY_JSON_STRING,
    pacing: EMPTY_ARRAY_JSON_STRING,
    units: originalCourse.units.map(u => ({ // Preserve unit IDs and structure
      ...u,
      unitName: '',
      timeAllotted: '', // Initialize plain text fields
      learningObjectives: EMPTY_ARRAY_JSON_STRING,
      standards: EMPTY_ARRAY_JSON_STRING,
      biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
      instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING,
      resources: EMPTY_ARRAY_JSON_STRING,
      assessments: EMPTY_ARRAY_JSON_STRING,
    }))
  };

  let currentUnitId: string | null = null;
  // `currentFieldContext` will now track the specific key and scope
  let currentFieldContext: { scope: 'course' | 'unit'; key: string; type: FieldType } | null = null;
  let fieldContentAccumulator: JSONContent[] = [];

  function saveAccumulatedContent() {
    if (!currentFieldContext || fieldContentAccumulator.length === 0) {
      fieldContentAccumulator = []; // Reset even if nothing to save for this context
      return;
    }

    const { scope, key, type } = currentFieldContext;
    let finalContent: any;

    if (type === FieldType.EditableHeader) {
      finalContent = fieldContentAccumulator[0]?.content?.map(cn => cn.text || '').join('').trim() || '';
    } else if (type === FieldType.PlainText) { // For timeAllotted specifically
        // Assuming the plain text is directly in the first paragraph node's text content
        finalContent = fieldContentAccumulator[0]?.content?.map(cn => cn.text || '').join('').trim() || '';
    } else { // RichText
      finalContent = JSON.stringify({ type: 'doc', content: fieldContentAccumulator });
    }

    if (scope === 'course') {
      (newCourse as any)[key] = finalContent;
    } else if (scope === 'unit' && currentUnitId) {
      const unit = newCourse.units.find(u => u.id === currentUnitId);
      if (unit) {
        (unit as any)[key] = finalContent;
      } else {
        console.warn(`tiptapJsonToCourse: Unit with ID ${currentUnitId} not found for key ${key}.`);
      }
    }
    fieldContentAccumulator = [];
  }

  json.content?.forEach(node => {
    const nodeType = node.type;
    const attrs = node.attrs || {};
    const fieldKeyAttr = attrs.fieldKey as string; // e.g., "course.title", "unit.unitId.unitName.header"
    const fieldKeyForPlainTextAttr = attrs.fieldKeyForPlainText as string; // e.g., "unit.unitId.timeAllotted"


    if (nodeType === 'editableHeader') {
      saveAccumulatedContent(); // Save previous field's content
      const parts = fieldKeyAttr.split('.'); // [scope, key] or [scope, unitId, key]
      if (parts[0] === 'course') {
        currentUnitId = null;
        currentFieldContext = { scope: 'course', key: parts[1], type: FieldType.EditableHeader };
        fieldContentAccumulator.push(node); // Accumulate the header node itself for its text content
        saveAccumulatedContent(); // Save this editable header immediately
        currentFieldContext = null;
      } else if (parts[0] === 'unit') {
        currentUnitId = attrs.sectionId as string || parts[1]; // Use sectionId which is the unit.id
        currentFieldContext = { scope: 'unit', key: 'unitName', type: FieldType.EditableHeader };
        fieldContentAccumulator.push(node);
        saveAccumulatedContent();
        currentFieldContext = null;
      }
    } else if (nodeType === 'unmodifiableHeader') {
      saveAccumulatedContent(); // Save previous field's content
      const headerFieldKey = attrs.fieldKey as string; // e.g. "course.description.header" or "unit.xyz.learningObjectives.header"
      const parts = headerFieldKey.split('.');
      const scope = parts[0] as 'course' | 'unit';
      let key: string;

      if (scope === 'course') {
        currentUnitId = null;
        key = parts[1]; // e.g. "description"
        currentFieldContext = { scope, key, type: fieldConfig.course[key as keyof typeof fieldConfig.course]?.type || FieldType.RichText };
      } else if (scope === 'unit') {
        currentUnitId = parts[1]; // unitId
        key = parts[2]; // e.g. "learningObjectives"
        const unitConfig = fieldConfig.unit[key as keyof typeof fieldConfig.unit];
        currentFieldContext = { scope, key, type: unitConfig?.type || FieldType.RichText };
      }
    } else if (fieldKeyForPlainTextAttr && currentFieldContext && currentFieldContext.type === FieldType.PlainText) {
        // This node is the paragraph holding the plain text for timeAllotted
        const parts = fieldKeyForPlainTextAttr.split('.'); // "unit.unitId.timeAllotted"
        if (parts[0] === 'unit' && parts[1] === currentUnitId && parts[2] === currentFieldContext.key) {
            fieldContentAccumulator.push(node);
            saveAccumulatedContent(); // Save this plain text field immediately
            currentFieldContext = null; // Reset context after plain text is saved
        }
    } else if (currentFieldContext && currentFieldContext.type === FieldType.RichText) {
      // Accumulate content for the current RichText field
      fieldContentAccumulator.push(node);
    }
  });

  saveAccumulatedContent(); // Save any remaining content

  // Ensure all units from originalCourse are present and fields are initialized if empty
  newCourse.units = originalCourse.units.map(originalUnit => {
    let processedUnit = newCourse.units.find(nu => nu.id === originalUnit.id);
    if (!processedUnit) { // Should not happen if mapping from originalCourse.units initially
      console.warn(`Unit ${originalUnit.id} was in original but not found after processing. Re-adding as empty.`);
      processedUnit = { ...originalUnit }; // Create a new object for safety
      (Object.keys(fieldConfig.unit) as Array<keyof Omit<Unit, 'id'>>).forEach(key => {
        const conf = fieldConfig.unit[key];
        if (conf?.type === FieldType.RichText) (processedUnit as any)[key] = EMPTY_ARRAY_JSON_STRING;
        else if (conf?.type === FieldType.PlainText || conf?.type === FieldType.EditableHeader) (processedUnit as any)[key] = '';
      });
    } else { // Ensure all fields are at least initialized
        (Object.keys(fieldConfig.unit) as Array<keyof Omit<Unit, 'id'>>).forEach(key => {
            if (processedUnit && !(processedUnit as any)[key]) { // If field is falsy (empty string, null, undefined)
                 const conf = fieldConfig.unit[key];
                 if (conf?.type === FieldType.RichText) (processedUnit as any)[key] = EMPTY_ARRAY_JSON_STRING;
                 else if (conf?.type === FieldType.PlainText || conf?.type === FieldType.EditableHeader) (processedUnit as any)[key] = '';
            }
        });
    }
    return processedUnit!;
  });

  // Ensure all course fields are initialized if empty
  (Object.keys(fieldConfig.course) as Array<keyof typeof fieldConfig.course>).forEach(key => {
    if (!(newCourse as any)[key]) {
        const conf = fieldConfig.course[key];
        if (conf?.type === FieldType.RichText) (newCourse as any)[key] = EMPTY_ARRAY_JSON_STRING;
        else if (conf?.type === FieldType.EditableHeader) (newCourse as any)[key] = '';
    }
  });

  return newCourse;
}