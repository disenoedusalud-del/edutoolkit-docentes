import { db } from "@/lib/firebase/client";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";

export interface CourseModule {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    order: number;
    createdAt: any;
}

export async function createModule(courseId: string, title: string, description: string = ""): Promise<string> {
    const modulesRef = collection(db, "modules");
    const docRef = await addDoc(modulesRef, {
        courseId,
        title,
        description,
        order: Date.now(),
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getCourseModules(courseId: string): Promise<CourseModule[]> {
    const modulesRef = collection(db, "modules");
    const q = query(modulesRef, where("courseId", "==", courseId));
    const querySnapshot = await getDocs(q);

    const modules = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as CourseModule));

    return modules.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function updateModule(moduleId: string, data: { title?: string; description?: string; order?: number }) {
    const docRef = doc(db, "modules", moduleId);
    await updateDoc(docRef, data);
}

export async function deleteModule(moduleId: string) {
    // 1. Delete associated resources first
    const resourcesRef = collection(db, "resources");
    const q = query(resourcesRef, where("moduleId", "==", moduleId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // 2. Delete the module
    batch.delete(doc(db, "modules", moduleId));

    await batch.commit();
}
