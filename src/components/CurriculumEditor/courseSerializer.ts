import { type JSONContent } from '@tiptap/react';
import { type Course, type Unit } from '../../types';
// Assuming EMPTY_ARRAY_JSON_STRING is correctly imported, e.g., from a shared constants file
// For now, keeping the App.tsx import path, but a constants file is better.
import { EMPTY_ARRAY_JSON_STRING } from '../../App';

export const COURSE_HEADER_SECTION_ID = 'course-overview-header';

export enum FieldType {
  EditableHeader = 'editableHeader',
  RichText = 'richText',
  PlainText = 'plainText',
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
    name: { label: 'Course Name/Code:', type: FieldType.EditableHeader, defaultLevel: 3, isSectionHeader: false } as FieldConfigItem,
    description: { label: 'Description', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    biblicalBasis: { label: 'Biblical Basis', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    materials: { label: 'Materials', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
    pacing: { label: 'Pacing', type: FieldType.RichText, isSectionHeader: true } as FieldConfigItem,
  } as Record<keyof Omit<Course, 'id' | 'units' >, FieldConfigItem>,
  unit: {
    unitName: { label: 'Unit Name:', type: FieldType.EditableHeader, defaultLevel: 2, isSectionHeader: true } as FieldConfigItem,
    timeAllotted: { label: 'Time Allotted:', type: FieldType.PlainText, isSectionHeader: false } as FieldConfigItem, // This will be a paragraph
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

  // Course Title (Editable Header)
  const courseTitleText = course.title || '';
  content.push({
    type: 'editableHeader',
    attrs: {
      level: fieldConfig.course.title.defaultLevel || 1,
      label: fieldConfig.course.title.label,
      fieldKey: 'course.title',
      sectionId: COURSE_HEADER_SECTION_ID,
    },
    // FIX: If text is empty, content array is empty
    content: courseTitleText ? [{ type: 'text', text: courseTitleText }] : [],
  });

  // Course Name (Editable Header)
  const courseNameText = course.name || '';
  content.push({
    type: 'editableHeader',
    attrs: {
      level: fieldConfig.course.name.defaultLevel || 3,
      label: fieldConfig.course.name.label,
      fieldKey: 'course.name',
    },
    // FIX: If text is empty, content array is empty
    content: courseNameText ? [{ type: 'text', text: courseNameText }] : [],
  });

  // Helper to add RichText sections for Course
  const addCourseRichTextSection = (
    fieldKey: keyof Omit<Course, 'id' | 'title' | 'name' | 'units'>,
    data: string | undefined | null
  ) => {
    const config = fieldConfig.course[fieldKey];
    if (!config) {
        console.warn(`No fieldConfig for course field: ${String(fieldKey)}`);
        return;
    }
    // This header introduces the section
    content.push({
      type: 'unmodifiableHeader',
      attrs: { level: 2, label: config.label, fieldKey: `course.${String(fieldKey)}.header` },
    });

    try {
      const jsonData = JSON.parse(data || EMPTY_ARRAY_JSON_STRING);
      if (jsonData.type === 'doc' && Array.isArray(jsonData.content) && jsonData.content.length > 0) {
        content.push(...jsonData.content);
      } else if (Array.isArray(jsonData) && jsonData.length > 0) { // Assumes jsonData is an array of Tiptap nodes
        content.push(...jsonData);
      } else if (jsonData.type && jsonData.content) { // Single node object with content
        content.push(jsonData);
      } else { // Handles EMPTY_ARRAY_JSON_STRING (parsed to []), or empty/invalid doc/array
        content.push({ type: 'paragraph' }); // Add a single empty paragraph
      }
    } catch (e) {
      console.warn(`Failed to parse JSON for course field ${String(fieldKey)}, adding empty paragraph. Data:`, data, "Error:", e);
      // FIX: If data was a string but invalid JSON, create an empty paragraph, or a paragraph with the text if it's not empty.
      const fallbackText = (typeof data === 'string' && data.trim() !== '') ? data : '';
      content.push({ type: 'paragraph', content: fallbackText ? [{ type: 'text', text: fallbackText }] : [] });
    }
  };

  addCourseRichTextSection('description', course.description);
  addCourseRichTextSection('biblicalBasis', course.biblicalBasis);
  addCourseRichTextSection('materials', course.materials);
  addCourseRichTextSection('pacing', course.pacing);


  // --- UNITS ---
  (course.units || []).forEach((unit) => {
    // Unit Name (Editable Header)
    const unitNameText = unit.unitName || '';
    content.push({
      type: 'editableHeader',
      attrs: {
        level: fieldConfig.unit.unitName.defaultLevel || 2,
        label: fieldConfig.unit.unitName.label,
        fieldKey: `unit.${unit.id}.unitName`,
        sectionId: unit.id, // Crucial for scrolling and identification
      },
      // FIX: If text is empty, content array is empty
      content: unitNameText ? [{ type: 'text', text: unitNameText }] : [],
    });

    // Unit Time Allotted (PlainText, represented by an UnmodifiableHeader and a Paragraph)
    const timeAllottedConfig = fieldConfig.unit.timeAllotted;
    content.push({
        type: 'unmodifiableHeader',
        attrs: { level: 3, label: timeAllottedConfig.label, fieldKey: `unit.${unit.id}.timeAllotted.header` },
    });
    const timeAllottedText = unit.timeAllotted || '';
    content.push({
        type: 'paragraph', // This paragraph node will hold the timeAllotted text
        attrs: { fieldKey: `unit.${unit.id}.timeAllotted.content` }, // Add a fieldKey for easier parsing back
        // FIX: If text is empty, content array is empty for the paragraph
        content: timeAllottedText ? [{ type: 'text', text: timeAllottedText }] : [],
    });


    // Other Unit fields (RichText)
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
          } else if (Array.isArray(jsonData) && jsonData.length > 0) {
            content.push(...jsonData);
          } else if (jsonData.type && jsonData.content) {
            content.push(jsonData);
          } else {
            content.push({ type: 'paragraph' });
          }
        } catch (e) {
          console.warn(`Failed to parse JSON for unit ${unit.id} field ${String(fieldKey)}, adding empty paragraph. Data:`, unitData, "Error:", e);
          const fallbackText = (typeof unitData === 'string' && unitData.trim() !== '') ? unitData : '';
          content.push({ type: 'paragraph', content: fallbackText ? [{ type: 'text', text: fallbackText }] : [] });
        }
      }
    });
  });

  return { type: 'doc', content };
}


export function tiptapJsonToCourse(json: JSONContent, originalCourse: Course): Course {
  const newCourse: Course = {
    ...originalCourse, // Keep original ID
    title: '', name: '', description: EMPTY_ARRAY_JSON_STRING,
    biblicalBasis: EMPTY_ARRAY_JSON_STRING, materials: EMPTY_ARRAY_JSON_STRING,
    pacing: EMPTY_ARRAY_JSON_STRING,
    // Initialize units based on original course to preserve IDs and structure
    // Fields will be populated or defaulted below.
    units: originalCourse.units.map(u => ({
      ...u, // Keep original unit ID and other potential non-Tiptap fields
      unitName: '', timeAllotted: '', learningObjectives: EMPTY_ARRAY_JSON_STRING,
      standards: EMPTY_ARRAY_JSON_STRING, biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
      instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING,
      resources: EMPTY_ARRAY_JSON_STRING, assessments: EMPTY_ARRAY_JSON_STRING,
    }))
  };

  let currentUnitId: string | null = null;
  let currentFieldContext: { scope: 'course' | 'unit'; fieldKeyPart: string; type: FieldType } | null = null;
  let fieldContentAccumulator: JSONContent[] = [];

  function saveAccumulatedContent() {
    if (!currentFieldContext) return;

    const { scope, fieldKeyPart, type } = currentFieldContext;
    let finalContent: any;

    if (type === FieldType.EditableHeader || (type === FieldType.PlainText && fieldKeyPart === 'timeAllotted')) {
        // For EditableHeader and PlainText ('timeAllotted'), content is the direct text.
        // Accumulator might have one node (header or paragraph)
        // Its content array's first text node contains the value.
        finalContent = fieldContentAccumulator[0]?.content?.map(cn => cn.text || '').join('').trim() || '';

    } else { // RichText
        finalContent = fieldContentAccumulator.length > 0
            ? JSON.stringify({ type: 'doc', content: fieldContentAccumulator }) // Store as a 'doc'
            : EMPTY_ARRAY_JSON_STRING; // If no content nodes, store as empty array string
    }

    if (scope === 'course') {
        (newCourse as any)[fieldKeyPart] = finalContent;
    } else if (scope === 'unit' && currentUnitId) {
      const unitIndex = newCourse.units.findIndex(u => u.id === currentUnitId);
      if (unitIndex !== -1) {
        (newCourse.units[unitIndex] as any)[fieldKeyPart] = finalContent;
      } else {
        console.warn(`tiptapJsonToCourse: Unit with ID ${currentUnitId} not found in newCourse.units during save.`);
      }
    }
    fieldContentAccumulator = []; // Reset for next field
  }

  json.content?.forEach(node => {
    const nodeType = node.type; // Tiptap schema nodes have a 'name' property on their type
    const attrs = node.attrs || {};
    const fieldKeyAttr = attrs.fieldKey as string;

    // Detect end of a field or start of a new one
    if (nodeType === 'editableHeader') {
      saveAccumulatedContent(); // Save previous field's content

      // This node itself contains its content
      fieldContentAccumulator = [node]; // This node is the content for this fieldKey

      if (fieldKeyAttr?.startsWith('course.')) {
        currentUnitId = null;
        const keyPart = fieldKeyAttr.split('.')[1]; // 'title' or 'name'
        currentFieldContext = { scope: 'course', fieldKeyPart: keyPart, type: FieldType.EditableHeader };
      } else if (fieldKeyAttr?.startsWith('unit.')) {
        // sectionId on the editableHeader is the unit's ID
        currentUnitId = attrs.sectionId as string || fieldKeyAttr.split('.')[1];
        currentFieldContext = { scope: 'unit', fieldKeyPart: 'unitName', type: FieldType.EditableHeader };
      }
      saveAccumulatedContent(); // Editable header content is self-contained and processed immediately
      currentFieldContext = null; // Reset context

    } else if (nodeType === 'unmodifiableHeader') {
      saveAccumulatedContent(); // Save previous field's content

      // This header signals the start of a new field's content that will follow
      if (fieldKeyAttr?.startsWith('course.')) {
        currentUnitId = null;
        const keyPart = fieldKeyAttr.split('.')[1]; // e.g., 'description'
        const config = (fieldConfig.course as any)[keyPart];
        currentFieldContext = { scope: 'course', fieldKeyPart: keyPart, type: config?.type || FieldType.RichText };
      } else if (fieldKeyAttr?.startsWith('unit.')) {
        const parts = fieldKeyAttr.split('.'); // unit, unit_id, field_name_part, header
        currentUnitId = parts[1];
        const keyPart = parts[2]; // e.g., 'learningObjectives' or 'timeAllotted'
        const config = (fieldConfig.unit as any)[keyPart];
        currentFieldContext = { scope: 'unit', fieldKeyPart: keyPart, type: config?.type || FieldType.RichText };
      }
    } else if (currentFieldContext) {
        // If we are in a field context (i.e., after an unmodifiableHeader, or for PlainText under its header)
        if (currentFieldContext.type === FieldType.PlainText && currentFieldContext.fieldKeyPart === 'timeAllotted') {
            // For timeAllotted, the content is the paragraph immediately following its unmodifiableHeader
            // We added a fieldKey to this paragraph: `unit.${unit.id}.timeAllotted.content`
            if (attrs.fieldKey === `unit.${currentUnitId}.timeAllotted.content`) {
                 fieldContentAccumulator.push(node); // Accumulate this paragraph node
                 // Since it's PlainText and directly follows, we can save it immediately
                 saveAccumulatedContent();
                 currentFieldContext = null; // This specific PlainText field is done
            }
        } else if (currentFieldContext.type === FieldType.RichText) {
             // Accumulate general RichText content nodes
            fieldContentAccumulator.push(node);
        }
    }
  });

  saveAccumulatedContent(); // Save any remaining content for the last field

  // Post-processing: Ensure all units from originalCourse are present and fields are defaulted
  newCourse.units = originalCourse.units.map(originalUnit => {
    let processedUnit = newCourse.units.find(nu => nu.id === originalUnit.id);

    if (!processedUnit) {
      // This case should ideally not happen if we base newCourse.units on originalCourse.units
      // But as a fallback, create an empty shell.
      console.warn(`Unit ${originalUnit.id} was in original but not found after processing. Re-adding as empty.`);
      processedUnit = { ...originalUnit }; // Keep ID
      (Object.keys(fieldConfig.unit) as Array<keyof Omit<Unit, 'id'>>).forEach(key => {
        const conf = fieldConfig.unit[key];
        if (conf?.type === FieldType.RichText) (processedUnit as any)[key] = EMPTY_ARRAY_JSON_STRING;
        else (processedUnit as any)[key] = '';
      });
      return processedUnit;
    }

    // Ensure all fields in the processed unit are defaulted if they ended up empty
    (Object.keys(fieldConfig.unit) as Array<keyof Omit<Unit, 'id'>>).forEach(key => {
      const conf = fieldConfig.unit[key];
      if (!(processedUnit as any)[key] || ((processedUnit as any)[key] === EMPTY_ARRAY_JSON_STRING && conf?.type !== FieldType.RichText)) {
        if (conf?.type === FieldType.RichText) {
          (processedUnit as any)[key] = EMPTY_ARRAY_JSON_STRING;
        } else { // PlainText or EditableHeader
          (processedUnit as any)[key] = '';
        }
      }
    });
    return processedUnit;
  });

  // Ensure all course-level fields are defaulted if empty
  (Object.keys(fieldConfig.course) as Array<keyof Omit<Course, 'id' | 'units'>>).forEach(key => {
    const conf = fieldConfig.course[key];
    if (!(newCourse as any)[key] || ((newCourse as any)[key] === EMPTY_ARRAY_JSON_STRING && conf?.type !== FieldType.RichText)) {
        if (conf?.type === FieldType.RichText) {
            (newCourse as any)[key] = EMPTY_ARRAY_JSON_STRING;
        } else { // PlainText or EditableHeader
            (newCourse as any)[key] = '';
        }
    }
  });

  return newCourse;
}