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
  addDoc,
  serverTimestamp,
  Timestamp,
  deleteField,
  updateDoc,
  deleteDoc,
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
const CURRICULUM_SUMMARIES_DOC_ID = 'curriculumSummaries';
const TEACHERS_COLLECTION_NAME = 'teachers';

const ADMIN_EMAILS = ['dguenther@legacyknights.org'];

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
    if (courseId === CURRICULUM_SUMMARIES_DOC_ID) {
        console.warn(`Attempted to fetch summary document as a course: ${courseId}`);
        return null;
    }
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
  const timestampForSubmission = serverTimestamp();
  const summariesDocRef = doc(db, CURRICULUM_COLLECTION_NAME, CURRICULUM_SUMMARIES_DOC_ID);

  try {
    let courseDocIdToReturn: string;
    let summaryEntryData: any;
    let shouldWriteToSummary = false; // Flag to control summary write

    if (currentCourseId === null) { // Creating a new course document
      const newCourseData: Omit<Course, 'id'> = {
        ...courseContent,
        progress,
        isApproved: true, // New courses are initially approved
        submittedBy: currentUserEmail,
        submittedAt: timestampForSubmission as Timestamp,
        version: 1,
        originalCourseId: null,
      };
      const courseCollectionRef = collection(db, CURRICULUM_COLLECTION_NAME);
      const docRef = await addDoc(courseCollectionRef, newCourseData);
      courseDocIdToReturn = docRef.id;
      console.log("New approved course created with ID:", courseDocIdToReturn);

      summaryEntryData = {
        title: newCourseData.title, department: newCourseData.department, progress: newCourseData.progress,
        isApproved: newCourseData.isApproved, originalCourseId: newCourseData.originalCourseId, version: newCourseData.version,
        submittedAt: timestampForSubmission,
        submittedBy: newCourseData.submittedBy,
      };
      shouldWriteToSummary = true; // New approved courses get a summary

    } else { // Updating an existing course document or creating a suggestion from an approved one
      const existingCourseDocRef = doc(db, CURRICULUM_COLLECTION_NAME, currentCourseId);
      const existingCourseDocSnap = await getDoc(existingCourseDocRef);
      if (!existingCourseDocSnap.exists()) throw new Error(`Course with ID ${currentCourseId} not found.`);
      const existingCourseData = existingCourseDocSnap.data() as Course;

      if (existingCourseData.isApproved) { // Submitting changes to an approved course (creates a new suggestion document)
        const suggestionDocData: Omit<Course, 'id'> = {
          ...courseContent, progress, isApproved: false, submittedBy: currentUserEmail,
          submittedAt: timestampForSubmission as Timestamp, originalCourseId: currentCourseId,
          version: existingCourseData.version,
        };
        const courseCollectionRef = collection(db, CURRICULUM_COLLECTION_NAME);
        const suggestionDocRef = await addDoc(courseCollectionRef, suggestionDocData);
        courseDocIdToReturn = suggestionDocRef.id;
        console.log(`New suggestion created: ${courseDocIdToReturn} for original ${currentCourseId}`);
        
        // DO NOT create a summary entry for the new suggestion
        shouldWriteToSummary = false;

      } else { // Updating an existing suggestion document
        courseDocIdToReturn = currentCourseId;
        const suggestionUpdateData = {
          ...courseContent, progress, submittedBy: currentUserEmail,
          submittedAt: timestampForSubmission,
          originalCourseId: existingCourseData.originalCourseId,
          version: existingCourseData.version,
          isApproved: false,
        };
        await setDoc(existingCourseDocRef, suggestionUpdateData, { merge: true });
        console.log(`Suggestion updated: ${courseDocIdToReturn}`);

        // DO NOT update/create a summary entry for an updated suggestion
        shouldWriteToSummary = false;
      }
    }
    
    if (shouldWriteToSummary && summaryEntryData) {
      const updatePayloadForSummariesDoc = {
        [`summaries.${courseDocIdToReturn}`]: summaryEntryData
      };
      await setDoc(summariesDocRef, updatePayloadForSummariesDoc, { merge: true });
      console.log(`Summary for approved course ${courseDocIdToReturn} updated in ${CURRICULUM_SUMMARIES_DOC_ID}.`);
    } else {
      console.log(`Skipping summary write for suggestion/non-approved course: ${courseDocIdToReturn}`);
    }

    return courseDocIdToReturn;
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
  submittedBy?: string;
}

export const fetchAllCourseMetadata = async (
  userEmail: string | null,
  // `onlyApproved` will now always effectively be true for this function
  // as summaries only contain approved courses.
  // We keep the parameter for potential future changes but note its current behavior.
  onlyApproved = true 
): Promise<CourseMetadata[]> => {
  try {
    const summariesDocRef = doc(db, CURRICULUM_COLLECTION_NAME, CURRICULUM_SUMMARIES_DOC_ID);
    const summariesSnap = await getDoc(summariesDocRef);

    let allSummariesFromMap: CourseMetadata[] = [];

    if (summariesSnap.exists()) {
      const summariesContainer = summariesSnap.data();
      const summariesData = summariesContainer?.summaries;
      if (summariesData && typeof summariesData === 'object') {
        allSummariesFromMap = Object.entries(summariesData)
          .map(([id, summary]: [string, any]) => ({ // Filter here to ensure only approved summaries are processed
            id: id,
            title: summary.title || 'Untitled Course',
            department: summary.department || 'Uncategorized',
            progress: typeof summary.progress === 'number' ? summary.progress : 0,
            isApproved: summary.isApproved === true, // Should always be true if it's in summaries now
            originalCourseId: summary.originalCourseId || null,
            version: typeof summary.version === 'number' ? summary.version : undefined,
            submittedBy: summary.submittedBy,
          }))
          .filter(summary => summary.isApproved); // Explicit filter, though ideally only approved are written
      }
    } else {
      console.log(`Summaries document (${CURRICULUM_SUMMARIES_DOC_ID}) not found. Creating it.`);
      await setDoc(summariesDocRef, { summaries: {} });
      return [];
    }

    // The `onlyApproved` parameter becomes less relevant if summaries *only* store approved courses.
    // However, if there's a chance non-approved sneak in or for future flexibility:
    // if (onlyApproved) {
    //   allSummariesFromMap = allSummariesFromMap.filter(summary => summary.isApproved);
    // }

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
      return allSummariesFromMap.filter(summary => authorizedTitles.includes(summary.title));
    }
    return allSummariesFromMap.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error("Error fetching course metadata from summaries document:", error);
    throw error;
  }
};

export const approveCourseSuggestion = async (suggestionId: string, approverEmail: string): Promise<string> => {
    const suggestionRef = doc(db, CURRICULUM_COLLECTION_NAME, suggestionId);
    const suggestionSnap = await getDoc(suggestionRef);
    const summariesDocRef = doc(db, CURRICULUM_COLLECTION_NAME, CURRICULUM_SUMMARIES_DOC_ID);

    if (!suggestionSnap.exists()) throw new Error(`Suggestion ${suggestionId} not found.`);
    const suggestionData = suggestionSnap.data() as Course;
    if (suggestionData.isApproved) throw new Error(`Course ${suggestionId} is already approved.`);

    let newVersion = 1;
    const serverTime = serverTimestamp();
    
    const updatesForSummariesDoc: Record<string, any> = {};

    // Update the suggestion document to be approved
    await updateDoc(suggestionRef, {
        isApproved: true,
        approvedBy: approverEmail,
        submittedAt: serverTime, // Update submittedAt to approval time
        // version will be set below based on original or current
        originalCourseId: null, // It becomes the new main approved version
    });

    // Logic for versioning and handling the original course (if any)
    if (suggestionData.originalCourseId) {
        // This suggestion was based on a previously approved course
        const originalCourseRef = doc(db, CURRICULUM_COLLECTION_NAME, suggestionData.originalCourseId);
        const originalCourseSnap = await getDoc(originalCourseRef);

        if (originalCourseSnap.exists()) {
            const originalCourseData = originalCourseSnap.data() as Course;
            newVersion = (originalCourseData.version || 0) + 1;
            // Mark original course (full doc) as not approved
            await updateDoc(originalCourseRef, { isApproved: false });
            // Remove the old approved course's summary
            updatesForSummariesDoc[`summaries.${suggestionData.originalCourseId}`] = deleteField();
            console.log(`Original course ${suggestionData.originalCourseId} marked as not approved and its summary removed.`);
        } else {
            // Original course not found, treat suggestion as a new base (its version might need adjustment)
            newVersion = (suggestionData.version || 0) + 1; // Or simply 1 if it was a fresh suggestion
            console.warn(`Original course ${suggestionData.originalCourseId} not found for suggestion ${suggestionId}. Approving suggestion as new base with version ${newVersion}.`);
        }
    } else {
        // This suggestion was not based on a previous approved course (e.g., it was a new course created as a suggestion)
        newVersion = (suggestionData.version || 0) + 1; // Increment its own version
    }

    // Update the version on the now-approved suggestion document
    await updateDoc(suggestionRef, { version: newVersion });

    // Add/Update summary for the newly approved course (which was the suggestion)
    // Fetch the latest suggestion data again AFTER updates to ensure `progress` and other fields are current for summary
    const finalApprovedCourseSnap = await getDoc(suggestionRef);
    const finalApprovedCourseData = finalApprovedCourseSnap.data() as Course;

    updatesForSummariesDoc[`summaries.${suggestionId}`] = {
        title: finalApprovedCourseData.title,
        department: finalApprovedCourseData.department,
        progress: finalApprovedCourseData.progress, // Use potentially updated progress
        isApproved: true,
        originalCourseId: null,
        version: newVersion,
        submittedAt: serverTime, // Reflects approval/new submission time
        submittedBy: finalApprovedCourseData.submittedBy, // Person who created the suggestion content
        approvedBy: approverEmail,
    };
    
    if (Object.keys(updatesForSummariesDoc).length > 0) {
        await updateDoc(summariesDocRef, updatesForSummariesDoc);
    }
    
    console.log(`Suggestion ${suggestionId} approved. New version is ${newVersion}.`);
    return suggestionId;
};

export const deleteCourseAndSummary = async (courseIdToDelete: string): Promise<void> => {
  if (courseIdToDelete === CURRICULUM_SUMMARIES_DOC_ID) {
    throw new Error("Cannot delete the main summaries document through this function.");
  }

  const courseDocRef = doc(db, CURRICULUM_COLLECTION_NAME, courseIdToDelete);
  const summariesDocRef = doc(db, CURRICULUM_COLLECTION_NAME, CURRICULUM_SUMMARIES_DOC_ID);

  try {
    await deleteDoc(courseDocRef);
    console.log(`Course document ${courseIdToDelete} deleted.`);

    const summariesSnap = await getDoc(summariesDocRef);
    if (summariesSnap.exists() && summariesSnap.data()?.summaries) {
        await updateDoc(summariesDocRef, {
            [`summaries.${courseIdToDelete}`]: deleteField()
        });
        console.log(`Summary entry for ${courseIdToDelete} deleted from ${CURRICULUM_SUMMARIES_DOC_ID}.`);
    } else {
        console.warn(`Summaries document or summaries map not found when trying to delete entry for ${courseIdToDelete}.`);
    }
  } catch (error) {
    console.error(`Error deleting course ${courseIdToDelete} and its summary:`, error);
    throw error;
  }
};

export { db, auth };