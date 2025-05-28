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
    const courseRef = doc(db, CURRICULUM_COLLECTION_NAME, courseId); // CHANGED
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      return { id: courseSnap.id, ...courseSnap.data() } as Course;
    } else {
      console.log("No such document in curriculum collection!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching course from curriculum:", error);
    throw error;
  }
};

export const saveCourse = async (courseId: string, courseData: Omit<Course, 'id'>): Promise<void> => {
  try {
    const courseRef = doc(db, CURRICULUM_COLLECTION_NAME, courseId); // CHANGED
    await setDoc(courseRef, courseData, { merge: true });
    console.log("Course saved successfully to curriculum:", courseId);
  } catch (error) {
    console.error("Error saving course to curriculum:", error);
    throw error;
  }
};

export interface CourseMetadata {
  id: string;
  title: string;
  name: string;
}

export const fetchAllCourseMetadata = async (): Promise<CourseMetadata[]> => {
  try {
    const coursesCollectionRef = collection(db, CURRICULUM_COLLECTION_NAME); // CHANGED
    const q = query(coursesCollectionRef);
    const querySnapshot = await getDocs(q);
    const courses: CourseMetadata[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      courses.push({ id: doc.id, title: data.title || 'Untitled Course', name: data.name || '' });
    });
    return courses;
  } catch (error) {
    console.error("Error fetching all course metadata from curriculum:", error);
    // This error (Missing or insufficient permissions) should NOT happen with "allow read: if true;"
    // If it does, then the issue is something else (network, Firebase config, etc.)
    throw error;
  }
};

export { db, auth };