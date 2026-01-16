import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadCourseImage(file: File, courseId: string): Promise<string> {
    try {
        // Use a fixed filename to ensure overwriting and save space
        // We preserve extension just in case, but usually 'cover' is enough with metadata.
        // Actually, to fully ensure overwrite regardless of extension (jpg vs png), 
        // using a fixed name without extension in the path is cleaner, 
        // or we accept that we might have one extra file if extension changes.
        // Let's use a fixed name 'cover_image' + extension is safer for browsers.
        // BUT to strictly follow user request of "replacing", let's try to stick to one file if possible.
        // For now, let's keep it simple: Fixed name 'cover' (Firebase stores contentType metadata consistently).

        const fileName = `cover_image`;
        const storageRef = ref(storage, `courses/${courseId}/${fileName}`);

        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Add a query param to bust cache if needed, though URL usually stays same
        return `${downloadURL}`; // ?t=${Date.now()} could be added on frontend
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}
