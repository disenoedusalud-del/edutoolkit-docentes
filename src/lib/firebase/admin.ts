import "server-only";
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Validated singleton approach for Next.js

const firebaseAdminConfig = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

function formatPrivateKey(key: string | undefined) {
    return key?.replace(/\\n/g, "\n");
}

export function createFirebaseAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const certConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    };

    return initializeApp({
        credential: cert(certConfig),
    });
}

export function getAdminAuth(): Auth {
    const app = createFirebaseAdminApp();
    return getAuth(app);
}

export function getAdminDb(): Firestore {
    const app = createFirebaseAdminApp();
    return getFirestore(app);
}
