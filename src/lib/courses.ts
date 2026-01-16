import { db } from "@/lib/firebase/client";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    serverTimestamp,
    orderBy,
    deleteDoc
} from "firebase/firestore";

export interface Course {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    status: "active" | "archived";
    createdAt: any;
    updatedAt: any;
}

export async function createCourse(title: string, imageUrl?: string): Promise<string> {
    const coursesRef = collection(db, "courses");
    const docRef = await addDoc(coursesRef, {
        title,
        imageUrl: imageUrl || "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getCourses(): Promise<Course[]> {
    const coursesRef = collection(db, "courses");
    // Order by createdAt desc is typical
    const q = query(coursesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Course));
}

export async function updateCourseStatus(courseId: string, status: "active" | "archived") {
    const courseRef = doc(db, "courses", courseId);
    await updateDoc(courseRef, {
        status,
        updatedAt: serverTimestamp()
    });
}

export async function updateCourseDetails(courseId: string, data: { title?: string; description?: string }) {
    const courseRef = doc(db, "courses", courseId);
    await updateDoc(courseRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

export async function getCoursesByIds(ids: string[]): Promise<Course[]> {
    if (ids.length === 0) return [];

    // Using Promise.all for simplicity in MVP (avoids 'in' query limits/index requirements)
    const refs = ids.map(id => doc(db, "courses", id));
    const snaps = await Promise.all(refs.map(ref => getDoc(ref)));

    return snaps
        .filter(s => s.exists())
        .map(s => ({ id: s.id, ...s.data() } as Course));
}

export async function deleteCourse(courseId: string) {
    await deleteDoc(doc(db, "courses", courseId));
    // Ideally we should also delete subcollections (resources) and storage files
    // But for MVP Firestore deletion of parent doesn't auto-delete subcollections.
    // We will leave orphan subcollections for now or handle them in cloud functions later.
    // For storage, we can delete the folder ideally.
}
