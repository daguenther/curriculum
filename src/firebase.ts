// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  addDoc,
  // updateDoc // If you only want to update specific fields
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import type { Course } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Optional
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Still useful if you want to gate other features or log user activity

const CURRICULUM_COLLECTION_NAME = 'curriculum'; // Define constant

export const fetchCourseById = async (courseId: string): Promise<Course | null> => {
  try {
    const courseRef = doc(db, CURRICULUM_COLLECTION_NAME, courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      // Ensure `name` field is handled if it exists in old data but is not expected in new Course type
      const data = courseSnap.data();
      const { name, ...restOfData } = data; // eslint-disable-line @typescript-eslint/no-unused-vars
      return { id: courseSnap.id, ...restOfData } as Course;
    } else {
      console.log("No such document in curriculum collection!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching course from curriculum:", error);
    throw error;
  }
};

export const saveCourse = async (courseId: string | null, courseData: Omit<Course, 'id'>): Promise<string> => {
  try {
    // Calculate progress before saving
    // We'll use a simplified client-side calculation here.
    // Ideally, this might be a Firebase Function or a more robust utility.
    let completedSections = 0;
    let totalSections = 0;

    // Course title
    totalSections++;
    if (courseData.title && courseData.title.trim() !== '') completedSections++;
    // Course subject (department)
    totalSections++;
    if (courseData.department && courseData.department.trim() !== '') completedSections++;
    
    // Course rich text fields
    ['description', 'biblicalBasis', 'materials', 'pacing'].forEach(field => {
        totalSections++;
        // Assuming isRichTextEmpty is available or you have similar logic
        // For simplicity, let's assume it's a function that checks if JSON string is empty.
        // This part is a placeholder for actual rich text empty check
        if (courseData[field as keyof typeof courseData] && String(courseData[field as keyof typeof courseData]) !== JSON.stringify([])) {
            completedSections++;
        }
    });

    // Units
     if (courseData.units && courseData.units.length > 0) {
        courseData.units.forEach(unit => {
            totalSections++; // unitName
            if (unit.unitName && unit.unitName.trim() !== '') completedSections++;

            ['learningObjectives', 'standards', 'biblicalIntegration', 'instructionalStrategiesActivities', 'resources', 'assessments'].forEach(field => {
                totalSections++;
                 if (unit[field as keyof typeof unit] && String(unit[field as keyof typeof unit]) !== JSON.stringify([])) {
                    completedSections++;
                }
            });
        });
    }
    const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
    const dataWithProgress = { ...courseData, progress };


    if (courseId === null) {
      // Create a new course with an auto-generated ID
      const coursesCollectionRef = collection(db, CURRICULUM_COLLECTION_NAME);
      const docRef = await addDoc(coursesCollectionRef, dataWithProgress);
      console.log("New course created successfully with ID:", docRef.id);
      return docRef.id;
    } else {
      // Update an existing course
      const courseRef = doc(db, CURRICULUM_COLLECTION_NAME, courseId);
      await setDoc(courseRef, dataWithProgress, { merge: true });
      console.log("Course saved successfully to curriculum:", courseId);
      return courseId;
    }
  } catch (error) {
    console.error("Error saving course to curriculum:", error);
    throw error;
  }
};

export interface CourseMetadata {
  id: string;
  title: string;
  // name: string; // Removed
  department: string; // This will be used as "Subject"
  progress: number;
}

export const fetchAllCourseMetadata = async (): Promise<CourseMetadata[]> => {
  try {
    const coursesCollectionRef = collection(db, CURRICULUM_COLLECTION_NAME);
    const q = query(coursesCollectionRef);
    const querySnapshot = await getDocs(q);
    const courses: CourseMetadata[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const department = typeof data.department === 'string' ? data.department : 'Uncategorized'; // Will be labeled "Subject"
      const progress = typeof data.progress === 'number' ? data.progress : 0; // Use the stored progress
      courses.push({
        id: doc.id,
        title: data.title || 'Untitled Course',
        // name: data.name || '', // Removed
        department, // This is the subject
        progress,
      });
    });
    return courses;
  } catch (error) {
    console.error("Error fetching all course metadata from curriculum:", error);
    throw error;
  }
};

export { db, auth };