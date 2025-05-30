// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  addDoc,
  serverTimestamp,
  where,
  Timestamp,
} from "firebase/firestore";
import type { Course, TeacherData } from './types';
import { isRichTextEmpty } from './utils/completionUtils';
import { COURSE_LEVEL_RICH_TEXT_FIELDS_FOR_COMPLETION, UNIT_LEVEL_RICH_TEXT_FIELDS_FOR_COMPLETION } from './utils/completionUtils';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const CURRICULUM_COLLECTION_NAME = 'curriculum';
const COURSE_SUMMARIES_COLLECTION_NAME = 'course_summaries';
const TEACHERS_COLLECTION_NAME = 'teachers';

const ADMIN_EMAILS = ['dguenther@legacyknights.org']; // Define admin emails here

// --- Authentication ---
export const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    return null;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export const onAuthStateChangedObservable = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// --- Teacher Data ---
export const fetchTeacherAuthorizedCourseTitles = async (teacherEmail: string): Promise<string[] | null> => {
  try {
    const teacherDocRef = doc(db, TEACHERS_COLLECTION_NAME, teacherEmail);
    const teacherDocSnap = await getDoc(teacherDocRef);
    if (teacherDocSnap.exists()) {
      const teacherData = teacherDocSnap.data() as TeacherData;
      return teacherData.courses || [];
    } else {
      console.log(`Teacher document not found for email: ${teacherEmail}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching teacher data for ${teacherEmail}:`, error);
    return null;
  }
};

// --- Course Data ---
export const fetchCourseById = async (courseId: string): Promise<Course | null> => {
  try {
    const courseRef = doc(db, CURRICULUM_COLLECTION_NAME, courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      const data = courseSnap.data();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name, ...restOfData } = data;
      return { id: courseSnap.id, ...restOfData } as Course;
    } else {
      console.log(`No such document in ${CURRICULUM_COLLECTION_NAME} collection with ID: ${courseId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching course from curriculum:", error);
    throw error;
  }
};

function calculateOverallProgress(courseData: Omit<Course, 'id' | 'progress' | 'isApproved' | 'submittedAt' | 'submittedBy' | 'version' | 'originalCourseId'>): number {
    let completed = 0;
    let total = 0;
    total++; if (courseData.title && courseData.title.trim() !== '') completed++;
    total++; if (courseData.department && courseData.department.trim() !== '') completed++;
    COURSE_LEVEL_RICH_TEXT_FIELDS_FOR_COMPLETION.forEach(field => {
        total++; if (!isRichTextEmpty(courseData[field as keyof typeof courseData])) completed++;
    });
    if (courseData.units && courseData.units.length > 0) {
        courseData.units.forEach(unit => {
            total++; if (unit.unitName && unit.unitName.trim() !== '') completed++;
            total++; if (unit.timeAllotted && unit.timeAllotted.trim() !== '') completed++;
            UNIT_LEVEL_RICH_TEXT_FIELDS_FOR_COMPLETION.forEach(field => {
                total++; if (!isRichTextEmpty(unit[field as keyof typeof unit])) completed++;
            });
        });
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export const submitCourseChanges = async (
  currentCourseId: string | null,
  courseContent: Omit<Course, 'id' | 'progress' | 'isApproved' | 'submittedAt' | 'submittedBy' | 'version' | 'originalCourseId'>,
  currentUserEmail: string
): Promise<string> => {
  const progress = calculateOverallProgress(courseContent);
  const submittedAtTimestamp = serverTimestamp();

  try {
    let newCourseIdToReturn: string;
    let summaryData: any; // To hold data for course_summaries

    if (currentCourseId === null) {
      const newCourseData: Omit<Course, 'id'> = {
        ...courseContent,
        progress,
        isApproved: true,
        submittedBy: currentUserEmail,
        submittedAt: submittedAtTimestamp as Timestamp,
        version: 1,
        originalCourseId: null,
      };
      const courseCollectionRef = collection(db, CURRICULUM_COLLECTION_NAME);
      const docRef = await addDoc(courseCollectionRef, newCourseData);
      newCourseIdToReturn = docRef.id;
      console.log("New approved course created with ID:", newCourseIdToReturn);

      summaryData = {
        title: newCourseData.title, department: newCourseData.department, progress: newCourseData.progress,
        isApproved: true, originalCourseId: null, version: 1,
        submittedAt: newCourseData.submittedAt, submittedBy: newCourseData.submittedBy,
      };

    } else {
      const existingCourseDoc = await getDoc(doc(db, CURRICULUM_COLLECTION_NAME, currentCourseId));
      if (!existingCourseDoc.exists()) throw new Error(`Course with ID ${currentCourseId} not found.`);
      const existingCourseData = existingCourseDoc.data() as Course;

      if (existingCourseData.isApproved) {
        const suggestionData: Omit<Course, 'id'> = {
          ...courseContent, progress, isApproved: false, submittedBy: currentUserEmail,
          submittedAt: submittedAtTimestamp as Timestamp, originalCourseId: currentCourseId,
          version: existingCourseData.version,
        };
        const courseCollectionRef = collection(db, CURRICULUM_COLLECTION_NAME);
        const suggestionDocRef = await addDoc(courseCollectionRef, suggestionData);
        newCourseIdToReturn = suggestionDocRef.id;
        console.log(`New suggestion created: ${newCourseIdToReturn} for original ${currentCourseId}`);
        summaryData = {
          title: suggestionData.title, department: suggestionData.department, progress: suggestionData.progress,
          isApproved: false, originalCourseId: suggestionData.originalCourseId, version: suggestionData.version,
          submittedAt: suggestionData.submittedAt, submittedBy: suggestionData.submittedBy,
        };
      } else {
        newCourseIdToReturn = currentCourseId;
        const suggestionUpdateData = {
          ...courseContent, progress, submittedBy: currentUserEmail, submittedAt: submittedAtTimestamp,
        };
        await setDoc(doc(db, CURRICULUM_COLLECTION_NAME, newCourseIdToReturn), suggestionUpdateData, { merge: true });
        console.log(`Suggestion updated: ${newCourseIdToReturn}`);
        summaryData = {
          title: courseContent.title, department: courseContent.department, progress, isApproved: false,
          submittedAt: submittedAtTimestamp, submittedBy: currentUserEmail,
          // originalCourseId and version are retained from existing suggestion on update
          originalCourseId: existingCourseData.originalCourseId, version: existingCourseData.version,
        };
      }
    }
    await setDoc(doc(db, COURSE_SUMMARIES_COLLECTION_NAME, newCourseIdToReturn), summaryData, {merge: true});
    return newCourseIdToReturn;
  } catch (error) {
    console.error("Error submitting course changes:", error);
    throw error;
  }
};

export interface CourseMetadata {
  id: string;
  title: string;
  department: string;
  progress: number;
  isApproved: boolean;
  originalCourseId?: string | null;
  version?: number;
}

export const fetchAllCourseMetadata = async (
  userEmail: string | null,
  onlyApproved = true
): Promise<CourseMetadata[]> => {
  try {
    let qBuilder = query(collection(db, COURSE_SUMMARIES_COLLECTION_NAME));
    if (onlyApproved) {
      qBuilder = query(qBuilder, where("isApproved", "==", true));
    }
    // Consider adding orderBy("title") or orderBy("department") then by("title")

    const querySnapshot = await getDocs(qBuilder);
    let allSummaries: CourseMetadata[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allSummaries.push({
        id: doc.id,
        title: data.title || 'Untitled Course',
        department: data.department || 'Uncategorized',
        progress: typeof data.progress === 'number' ? data.progress : 0,
        isApproved: data.isApproved === true,
        originalCourseId: data.originalCourseId || null,
        version: typeof data.version === 'number' ? data.version : undefined,
      });
    });

    if (userEmail && !ADMIN_EMAILS.includes(userEmail)) {
      const authorizedTitles = await fetchTeacherAuthorizedCourseTitles(userEmail);
      if (authorizedTitles === null) {
        console.warn(`No teacher record or courses found for ${userEmail}, showing no courses.`);
        return [];
      }
      if (authorizedTitles.length === 0) {
        console.log(`Teacher ${userEmail} has no courses assigned in their teacher document.`);
        return [];
      }
      return allSummaries.filter(summary => authorizedTitles.includes(summary.title));
    }
    return allSummaries;
  } catch (error) {
    console.error("Error fetching course metadata from summaries:", error);
    throw error;
  }
};

export const approveCourseSuggestion = async (suggestionId: string, approverEmail: string): Promise<string> => {
    const suggestionRef = doc(db, CURRICULUM_COLLECTION_NAME, suggestionId);
    const suggestionSnap = await getDoc(suggestionRef);

    if (!suggestionSnap.exists()) throw new Error(`Suggestion ${suggestionId} not found.`);
    const suggestionData = suggestionSnap.data() as Course;
    if (suggestionData.isApproved) throw new Error(`Course ${suggestionId} is already approved.`);

    let newVersion = 1;
    const serverTime = serverTimestamp();

    if (!suggestionData.originalCourseId) { // Approving a base document that was marked as not approved
        newVersion = (suggestionData.version || 0) + 1;
        await setDoc(suggestionRef, {
            isApproved: true, approvedBy: approverEmail, submittedAt: serverTime, version: newVersion,
        }, { merge: true });
        await setDoc(doc(db, COURSE_SUMMARIES_COLLECTION_NAME, suggestionId), {
            isApproved: true, version: newVersion, submittedAt: serverTime,
        }, { merge: true });
        console.log(`Course ${suggestionId} approved as version ${newVersion}.`);
        return suggestionId;
    }

    // Standard suggestion approval: deactivate old, activate new
    const originalCourseRef = doc(db, CURRICULUM_COLLECTION_NAME, suggestionData.originalCourseId);
    const originalCourseSnap = await getDoc(originalCourseRef);

    if (originalCourseSnap.exists()) {
        const originalCourseData = originalCourseSnap.data() as Course;
        newVersion = (originalCourseData.version || 0) + 1;
        await setDoc(originalCourseRef, { isApproved: false }, { merge: true });
        await setDoc(doc(db, COURSE_SUMMARIES_COLLECTION_NAME, suggestionData.originalCourseId), { isApproved: false }, { merge: true });
    }

    await setDoc(suggestionRef, {
        isApproved: true, submittedBy: suggestionData.submittedBy, // Keep original submitter
        submittedAt: serverTime, approvedBy: approverEmail, version: newVersion,
        originalCourseId: null, // It becomes the new approved version
    }, { merge: true });

    await setDoc(doc(db, COURSE_SUMMARIES_COLLECTION_NAME, suggestionId), {
        isApproved: true, originalCourseId: null, version: newVersion, submittedAt: serverTime,
    }, { merge: true });

    console.log(`Suggestion ${suggestionId} approved. New version is ${newVersion}. Original ${suggestionData.originalCourseId} marked as not approved.`);
    return suggestionId;
};

export { db, auth };