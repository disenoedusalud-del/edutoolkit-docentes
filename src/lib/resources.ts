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
    orderBy
} from "firebase/firestore";

export type ResourceType = "drive" | "video" | "link";

export interface Resource {
    id: string;
    courseId: string;
    moduleId?: string; // Optional: null/undefined implies "General" or no specific module
    title: string;
    type: ResourceType;
    url: string;
    tags?: string[]; // New: Tags support
    order: number;
    createdAt: any;
}

export async function createResource(courseId: string, title: string, type: ResourceType, url: string, moduleId?: string, tags: string[] = []): Promise<string> {
    const resourcesRef = collection(db, "resources");
    const docRef = await addDoc(resourcesRef, {
        courseId,
        moduleId: moduleId || null,
        title,
        type,
        url,
        tags, // Save tags
        order: Date.now(), // Uses timestamp as initial order
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function duplicateResource(resource: Resource) {
    await createResource(resource.courseId, `${resource.title} (Copia)`, resource.type, resource.url);
}

export async function updateResource(resourceId: string, data: Partial<Resource>) {
    const docRef = doc(db, "resources", resourceId);
    await updateDoc(docRef, data);
}

export async function getCourseResources(courseId: string): Promise<Resource[]> {
    const resourcesRef = collection(db, "resources");
    const simpleQ = query(resourcesRef, where("courseId", "==", courseId));
    const querySnapshot = await getDocs(simpleQ);

    const resources = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Resource));

    // Sort by order ascending
    return resources.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
    });
}

export async function reorderResources(items: Resource[]) {
    // Basic batch update substitute by iterating
    const updates = items.map((item, index) => {
        const docRef = doc(db, "resources", item.id);
        return updateDoc(docRef, { order: index });
    });
    await Promise.all(updates);
}

export async function deleteResource(resourceId: string) {
    await deleteDoc(doc(db, "resources", resourceId));
}
