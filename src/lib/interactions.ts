import { db } from "@/lib/firebase/client";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    getDoc,
    serverTimestamp
} from "firebase/firestore";
import { Resource } from "./resources";

// --- Favorites ---

export interface FavoriteItem {
    id: string; // userId_resourceId
    userId: string;
    resourceId: string;
    courseId: string;
    resourceTitle: string;
    resourceType: string;
    resourceUrl: string;
    createdAt: any;
}

export async function toggleFavorite(userId: string, resource: Resource) {
    const docId = `${userId}_${resource.id}`;
    const docRef = doc(db, "user_favorites", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        await deleteDoc(docRef);
        return false; // Removed
    } else {
        await setDoc(docRef, {
            userId,
            resourceId: resource.id,
            courseId: resource.courseId,
            resourceTitle: resource.title,
            resourceType: resource.type,
            resourceUrl: resource.url,
            createdAt: serverTimestamp()
        });
        return true; // Added
    }
}

export async function getUserFavorites(userId: string): Promise<FavoriteItem[]> {
    const ref = collection(db, "user_favorites");
    // Removed orderBy to avoid index requirement
    const q = query(ref, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FavoriteItem));

    // Client-side sort DESC
    return items.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
    });
}

// --- Recents ---

export interface RecentItem {
    id: string; // userId_resourceId
    userId: string;
    resourceId: string;
    courseId: string;
    resourceTitle: string;
    resourceType: string;
    resourceUrl: string;
    lastOpenedAt: any;
}

export async function trackResourceOpen(userId: string, resource: Resource) {
    const docId = `${userId}_${resource.id}`;
    const docRef = doc(db, "user_recents", docId);

    // Upsert
    await setDoc(docRef, {
        userId,
        resourceId: resource.id,
        courseId: resource.courseId,
        resourceTitle: resource.title,
        resourceType: resource.type,
        resourceUrl: resource.url,
        lastOpenedAt: serverTimestamp()
    }, { merge: true });
}

export async function getUserRecents(userId: string, limitCount = 5): Promise<RecentItem[]> {
    const ref = collection(db, "user_recents");
    // Removed orderBy and limit to avoid index requirement and ensure correct sorting in client
    const q = query(ref, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RecentItem));

    // Client-side sort DESC & Limit
    return items.sort((a, b) => {
        const timeA = a.lastOpenedAt?.seconds || 0;
        const timeB = b.lastOpenedAt?.seconds || 0;
        return timeB - timeA;
    }).slice(0, limitCount);
}

// --- Completion ---

export interface CompletedItem {
    id: string; // userId_resourceId
    userId: string;
    resourceId: string;
    courseId: string;
    completedAt: any;
}

export async function toggleCompleted(userId: string, resource: Resource) {
    const docId = `${userId}_${resource.id}`;
    const docRef = doc(db, "user_completed", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        await deleteDoc(docRef);
        return false; // Removed (unmarked)
    } else {
        await setDoc(docRef, {
            userId,
            resourceId: resource.id,
            courseId: resource.courseId,
            completedAt: serverTimestamp()
        });
        return true; // Added (marked)
    }
}

export async function getUserCompleted(userId: string, courseId?: string): Promise<CompletedItem[]> {
    const ref = collection(db, "user_completed");
    let q;

    if (courseId) {
        q = query(ref, where("userId", "==", userId), where("courseId", "==", courseId));
    } else {
        q = query(ref, where("userId", "==", userId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CompletedItem));
}
