// src/types/index.ts
import type { Timestamp } from "firebase/firestore";

export interface Unit {
  id: string;
  unitName: string;
  timeAllotted?: string; // JSONContent string or plain text, handled by serializer
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
  description: string; // JSONContent string
  biblicalBasis: string; // JSONContent string
  materials: string; // JSONContent string
  pacing: string; // JSONContent string
  units: Unit[];
  department: string; // Subject, plain text
  progress: number;
  isApproved: boolean;
  submittedBy?: string;
  submittedAt?: Timestamp | Date; // Firestore uses Timestamp, client might use Date
  version?: number;
  originalCourseId?: string | null;
  // Consider adding approvedBy and approvedAt if needed
  approvedBy?: string;
  approvedAt?: Timestamp | Date;
}

// New Interface for Teacher Data
export interface TeacherData {
  email: string;
  firstName: string;
  lastName: string;
  courses: string[]; // Array of course titles they are authorized for
  assignedTemplateIds: string[]; // Could be course IDs they can use as templates
}