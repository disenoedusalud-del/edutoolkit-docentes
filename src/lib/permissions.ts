import { db } from "@/lib/firebase/client";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    Timestamp,
    updateDoc,
    orderBy,
    limit
} from "firebase/firestore";

export interface CoursePermission {
    id: string;
    courseId: string;
    email: string;
    roleInCourse: "EDITOR" | "DOCENTE" | "VIEWER";
    createdAt: any;
    expiresAt?: Timestamp | null;
    name?: string;
}

export async function grantAccess(
    courseId: string,
    email: string,
    role: "EDITOR" | "DOCENTE" | "VIEWER" = "DOCENTE",
    expiresAt: Date | null = null,
    name: string = ""
): Promise<string | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const permissionsRef = collection(db, "course_access");

    // Check if already exists
    const q = query(
        permissionsRef,
        where("courseId", "==", courseId),
        where("email", "==", normalizedEmail)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return null; // Already exists
    }

    const docRef = await addDoc(permissionsRef, {
        courseId,
        email: normalizedEmail,
        roleInCourse: role,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
        name: name
    });
    return docRef.id;
}

export async function updateAccessExpiration(permissionId: string, expiresAt: Date | null) {
    const docRef = doc(db, "course_access", permissionId);
    await updateDoc(docRef, {
        expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null
    });
}

export async function getCoursePermissions(courseId: string): Promise<CoursePermission[]> {
    const permissionsRef = collection(db, "course_access");
    const q = query(permissionsRef, where("courseId", "==", courseId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as CoursePermission));
}

export async function revokeAccess(permissionId: string) {
    await deleteDoc(doc(db, "course_access", permissionId));
}

// Helper to check if a specific user email has access to a course
export async function hasAccess(courseId: string, email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const permissionsRef = collection(db, "course_access");
    const q = query(
        permissionsRef,
        where("courseId", "==", courseId),
        where("email", "==", normalizedEmail)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return false;

    const data = snapshot.docs[0].data();
    if (data.expiresAt) {
        const expires = (data.expiresAt as Timestamp).toDate();
        if (expires < new Date()) {
            return false; // Expired
        }
    }

    return true;
}

export async function getAuthorizedCoursesForUser(email: string): Promise<string[]> {
    const normalizedEmail = email.toLowerCase().trim();
    const permissionsRef = collection(db, "course_access");
    const q = query(permissionsRef, where("email", "==", normalizedEmail));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();

        // Remove expired
        if (data.expiresAt) {
            const expires = (data.expiresAt as Timestamp).toDate();
            if (expires < new Date()) {
                return null;
            }
        }

        return data.courseId as string;
    }).filter(id => !!id) as string[];
}

export async function getRecentAccessSuggestions(): Promise<{ email: string; name?: string }[]> {
    const permissionsRef = collection(db, "course_access");
    // Get recent permissions granted to build a suggestion list
    const q = query(permissionsRef, orderBy("createdAt", "desc"), limit(100));
    const snapshot = await getDocs(q);

    const uniqueMap = new Map<string, string>(); // email -> name

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.email) {
            // Keep the first name found (which is the most recent due to sort) OR if current is empty and we have a better one?
            // Since we sort desc, the first one we find is the MOST RECENT. We should use that name.
            if (!uniqueMap.has(data.email)) {
                uniqueMap.set(data.email, data.name || "");
            }
        }
    });

    return Array.from(uniqueMap.entries()).map(([email, name]) => ({ email, name }));
}

export async function getAllPermissions(): Promise<CoursePermission[]> {
    const permissionsRef = collection(db, "course_access");
    const q = query(permissionsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as CoursePermission));
}

export async function getUserNameFromPermissions(email: string): Promise<string | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const permissionsRef = collection(db, "course_access");
    const q = query(permissionsRef, where("email", "==", normalizedEmail), limit(5));
    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.name && data.name.trim() !== "") {
            return data.name;
        }
    }
    return null;
}
