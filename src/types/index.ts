// src/types/index.ts

export interface Unit {
  id: string; // Essential for tabs and keys
  unitName: string;
  timeAllotted?: string;
  learningObjectives: string; // JSONContent string
  standards: string; // JSONContent string
  biblicalIntegration: string; // JSONContent string
  instructionalStrategiesActivities: string; // JSONContent string
  resources: string; // JSONContent string
  assessments: string; // JSONContent string
  // any other unit-specific fields
}

export interface Course {
  id: string;
  title: string;
  // name: string; // e.g. "BIBLE101" - Removed as per request
  description: string; // JSONContent string
  biblicalBasis: string; // JSONContent string
  materials: string; // JSONContent string
  pacing: string; // JSONContent string
  units: Unit[];
  department: string; // This will be treated as "Subject"
  progress: number; // Overall progress percentage, to be calculated correctly
  // any other course-level fields
}