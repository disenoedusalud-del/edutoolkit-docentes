import { db } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { User } from "firebase/auth";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "DOCENTE" | "VIEWER";

export interface UserProfile {
    uid: string;
    email: string;
    roleGlobal: UserRole;
    createdAt?: any;
    updatedAt?: any;
}

export async function ensureUserProfile(user: User): Promise<UserProfile | null> {
    if (!user.email) return null;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        // Automatic Migration: if document has old 'role' but not 'roleGlobal'
        if (!data.roleGlobal && data.role) {
            try {
                await updateDoc(userRef, { roleGlobal: data.role });
                data.roleGlobal = data.role;
            } catch (e) {
                console.error("Migration error:", e);
            }
        }
        const roleGlobal = data.roleGlobal || data.role || "DOCENTE";
        return { ...data, roleGlobal } as UserProfile;
    } else {
        // Check for super admin list
        const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

        let role: UserRole = "DOCENTE";
        const emailLower = user.email.toLowerCase();

        if (superAdminEmails.includes(emailLower)) {
            role = "SUPER_ADMIN";
        } else if (adminEmails.includes(emailLower)) {
            role = "ADMIN";
        }

        const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            roleGlobal: role,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        try {
            await setDoc(userRef, newProfile);
            return newProfile;
        } catch (error) {
            console.error("Error creating user profile:", error);
            return null;
        }
    }
}

export function isAdmin(profile: UserProfile | null): boolean {
    return profile?.roleGlobal === "ADMIN" || profile?.roleGlobal === "SUPER_ADMIN";
}

// User Management Functions

import { collection, getDocs, updateDoc, query, where, limit } from "firebase/firestore";

export async function getAllUsers(): Promise<UserProfile[]> {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
}

export async function getAdmins(): Promise<UserProfile[]> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("roleGlobal", "in", ["ADMIN", "SUPER_ADMIN"]));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as UserProfile;
}

export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        roleGlobal: newRole,
        updatedAt: serverTimestamp()
    });
}
