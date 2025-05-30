// src/types/index.ts
import type { Timestamp } from "firebase/firestore";

export interface Unit {
  id: string;
  unitName: string;
  timeAllotted?: string;
  learningObjectives: string; // JSONContent string
  standards: string; // JSONContent string
  biblicalIntegration: string; // JSONContent string
  instructionalStrategiesActivities: string; // JSONContent string
  resources: string; // JSONContent string
  assessments: string; // JSONContent string
}

export interface Course {
  id: string;
  title: string;
  description: string;
  biblicalBasis: string;
  materials: string;
  pacing: string;
  units: Unit[];
  department: string; // Subject
  progress: number;
  isApproved: boolean;
  submittedBy?: string;
  submittedAt?: Timestamp | Date;
  version?: number;
  originalCourseId?: string | null;
}

// New Interface for Teacher Data
export interface TeacherData {
  email: string;
  firstName: string;
  lastName: string;
  courses: string[]; // Array of course titles they are authorized for
  assignedTemplateIds: string[];
}