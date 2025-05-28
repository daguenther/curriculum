// src/types/index.ts

export interface Unit {
  id?: string; // Optional: if units could ever be standalone or need unique keys for rendering
  unitName: string; // Typically plain text, could be an input field outside the main editor
  timeAllotted: string; // Typically plain text

  // These fields will store stringified Tiptap JSON
  learningObjectives: string;
  standards: string;
  biblicalIntegration: string;
  instructionalStrategiesActivities: string;
  resources: string;
  assessments: string;
}

export interface Course {
  id: string; // Document ID from Firebase
  title: string; // Typically plain text
  name: string;  // Typically plain text

  // These fields will store stringified Tiptap JSON
  description: string;
  biblicalBasis: string;
  materials: string;
  pacing: string;
  units: Unit[];
}