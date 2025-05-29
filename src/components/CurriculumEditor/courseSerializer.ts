// src/components/CurriculumEditor/courseSerializer.ts
import { type JSONContent } from '@tiptap/react'; // Changed from @tiptap/core for consistency if using React package
import { type Course, type Unit } from '../../types';
// Assuming EMPTY_ARRAY_JSON_STRING is correctly imported from a shared location.
// For now, using the path relative to App.tsx being in src/
// If App.tsx is in src/ and this file is in src/components/CurriculumEditor/, then:
// import { EMPTY_ARRAY_JSON_STRING } from '../../App';
// However, it's better to move EMPTY_ARRAY_JSON_STRING to a constants file.
// Let's assume it's available as:
import { EMPTY_ARRAY_JSON_STRING } from '../../App'; // Will keep your provided path for now.

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
  isSectionHeader?: boolean; // This might be used by your custom node rendering
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
    timeAllotted: { label: 'Time Allotted:', type: FieldType.PlainText, isSectionHeader: false } as FieldConfigItem,
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
    type: 'editableHeader', // This needs to be a registered Tiptap node
    attrs: {
      level: fieldConfig.course.title.defaultLevel || 1,
      label: fieldConfig.course.title.label,
      fieldKey: 'course.title',
      sectionId: COURSE_HEADER_SECTION_ID, // HTML ID for scrolling
    },
    content: courseTitleText ? [{ type: 'text', text: courseTitleText }] : [],
  });

  const courseNameText = course.name || '';
  content.push({
    type: 'editableHeader',
    attrs: {
      level: fieldConfig.course.name.defaultLevel || 3,
      label: fieldConfig.course.name.label,
      fieldKey: 'course.name',
      // No sectionId here, as COURSE_HEADER_SECTION_ID covers the whole course overview
    },
    content: courseNameText ? [{ type: 'text', text: courseNameText }] : [],
  });

  const addCourseRichTextSection = (
    fieldKey: keyof Omit<Course, 'id' | 'title' | 'name' | 'units'>,
    data: string | undefined | null
  ) => {
    const config = fieldConfig.course[fieldKey];
    if (!config) {
        console.warn(`No fieldConfig for course field: ${String(fieldKey)}`);
        return;
    }
    content.push({
      type: 'unmodifiableHeader', // This needs to be a registered Tiptap node
      attrs: { level: 2, label: config.label, fieldKey: `course.${String(fieldKey)}.header` },
    });

    try {
      const jsonData = JSON.parse(data || EMPTY_ARRAY_JSON_STRING);
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
      console.warn(`Failed to parse JSON for course field ${String(fieldKey)}, adding empty paragraph. Data:`, data, "Error:", e);
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
        sectionId: unit.id, // HTML ID for scrolling to this unit
      },
      content: unitNameText ? [{ type: 'text', text: unitNameText }] : [],
    });

    const timeAllottedConfig = fieldConfig.unit.timeAllotted;
    content.push({
        type: 'unmodifiableHeader',
        attrs: { level: 3, label: timeAllottedConfig.label, fieldKey: `unit.${unit.id}.timeAllotted.header` },
    });
    const timeAllottedText = unit.timeAllotted || '';
    content.push({
        type: 'paragraph',
        attrs: { fieldKey: `unit.${unit.id}.timeAllotted.content` },
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
    ...originalCourse,
    title: '', name: '', description: EMPTY_ARRAY_JSON_STRING,
    biblicalBasis: EMPTY_ARRAY_JSON_STRING, materials: EMPTY_ARRAY_JSON_STRING,
    pacing: EMPTY_ARRAY_JSON_STRING,
    units: originalCourse.units.map(u => ({
      ...u,
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
        finalContent = fieldContentAccumulator[0]?.content?.map(cn => cn.text || '').join('').trim() || '';
    } else {
        finalContent = fieldContentAccumulator.length > 0
            ? JSON.stringify({ type: 'doc', content: fieldContentAccumulator })
            : EMPTY_ARRAY_JSON_STRING;
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
    fieldContentAccumulator = [];
  }

  json.content?.forEach(node => {
    const nodeType = node.type;
    const attrs = node.attrs || {};
    const fieldKeyAttr = attrs.fieldKey as string;

    if (nodeType === 'editableHeader') {
      saveAccumulatedContent();
      fieldContentAccumulator = [node];

      if (fieldKeyAttr?.startsWith('course.')) {
        currentUnitId = null;
        const keyPart = fieldKeyAttr.split('.')[1];
        currentFieldContext = { scope: 'course', fieldKeyPart: keyPart, type: FieldType.EditableHeader };
      } else if (fieldKeyAttr?.startsWith('unit.')) {
        currentUnitId = attrs.sectionId as string || fieldKeyAttr.split('.')[1];
        currentFieldContext = { scope: 'unit', fieldKeyPart: 'unitName', type: FieldType.EditableHeader };
      }
      saveAccumulatedContent();
      currentFieldContext = null;

    } else if (nodeType === 'unmodifiableHeader') {
      saveAccumulatedContent();
      if (fieldKeyAttr?.startsWith('course.')) {
        currentUnitId = null;
        const keyPart = fieldKeyAttr.split('.')[1];
        const config = (fieldConfig.course as any)[keyPart];
        currentFieldContext = { scope: 'course', fieldKeyPart: keyPart, type: config?.type || FieldType.RichText };
      } else if (fieldKeyAttr?.startsWith('unit.')) {
        const parts = fieldKeyAttr.split('.');
        currentUnitId = parts[1];
        const keyPart = parts[2];
        const config = (fieldConfig.unit as any)[keyPart];
        currentFieldContext = { scope: 'unit', fieldKeyPart: keyPart, type: config?.type || FieldType.RichText };
      }
    } else if (currentFieldContext) {
        if (currentFieldContext.type === FieldType.PlainText && currentFieldContext.fieldKeyPart === 'timeAllotted') {
            if (attrs.fieldKey === `unit.${currentUnitId}.timeAllotted.content`) {
                 fieldContentAccumulator.push(node);
                 saveAccumulatedContent();
                 currentFieldContext = null;
            }
        } else if (currentFieldContext.type === FieldType.RichText) {
            fieldContentAccumulator.push(node);
        }
    }
  });

  saveAccumulatedContent();

  newCourse.units = originalCourse.units.map(originalUnit => {
    let processedUnit = newCourse.units.find(nu => nu.id === originalUnit.id);
    if (!processedUnit) {
      console.warn(`Unit ${originalUnit.id} was in original but not found after processing. Re-adding as empty.`);
      processedUnit = { ...originalUnit };
      (Object.keys(fieldConfig.unit) as Array<keyof Omit<Unit, 'id'>>).forEach(key => {
        const conf = fieldConfig.unit[key];
        if (conf?.type === FieldType.RichText) (processedUnit as any)[key] = EMPTY_ARRAY_JSON_STRING;
        else (processedUnit as any)[key] = '';
      });
      return processedUnit;
    }
    (Object.keys(fieldConfig.unit) as Array<keyof Omit<Unit, 'id'>>).forEach(key => {
      const conf = fieldConfig.unit[key];
      if (!(processedUnit as any)[key] || ((processedUnit as any)[key] === EMPTY_ARRAY_JSON_STRING && conf?.type !== FieldType.RichText)) {
        if (conf?.type === FieldType.RichText) {
          (processedUnit as any)[key] = EMPTY_ARRAY_JSON_STRING;
        } else {
          (processedUnit as any)[key] = '';
        }
      }
    });
    return processedUnit;
  });

  (Object.keys(fieldConfig.course) as Array<keyof Omit<Course, 'id' | 'units'>>).forEach(key => {
    const conf = fieldConfig.course[key];
    if (!(newCourse as any)[key] || ((newCourse as any)[key] === EMPTY_ARRAY_JSON_STRING && conf?.type !== FieldType.RichText)) {
        if (conf?.type === FieldType.RichText) {
            (newCourse as any)[key] = EMPTY_ARRAY_JSON_STRING;
        } else {
            (newCourse as any)[key] = '';
        }
    }
  });
  return newCourse;
}