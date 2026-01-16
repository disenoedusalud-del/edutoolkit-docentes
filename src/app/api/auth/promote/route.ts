import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const { email, role } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const auth = getAdminAuth();
        const db = getAdminDb();

        let uid: string;

        try {
            // 1. Try to get user by email
            const userRecord = await auth.getUserByEmail(email);
            uid = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // 2. User doesn't exist in Auth, create them (no password for now)
                const userRecord = await auth.createUser({
                    email,
                    emailVerified: false,
                });
                uid = userRecord.uid;
            } else {
                throw error;
            }
        }

        // 3. Create or Update the profile in Firestore using roleGlobal
        await db.collection("users").doc(uid).set({
            uid,
            email,
            roleGlobal: role || "DOCENTE",
            updatedAt: FieldValue.serverTimestamp(),
            // Only set createdAt if it doesn't exist? Since we use .set, it overwrites.
            // Let's use merge if we want to preserve old data, but for Admin promotion, 
            // overwriting roleGlobal is the primary goal.
        }, { merge: true });

        return NextResponse.json({ success: true, message: "User promoted/created successfully", uid });
    } catch (error: any) {
        console.error("Error in promote process:", error);
        return NextResponse.json({
            error: error.message || "Error al procesar el registro del administrador"
        }, { status: 500 });
    }
}
