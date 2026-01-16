import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const auth = getAdminAuth();

        // 1. Generate password reset link through Firebase
        let resetLink;
        try {
            resetLink = await auth.generatePasswordResetLink(email);
        } catch (authError: any) {
            console.error("Firebase Auth Error:", authError);
            if (authError.code === 'auth/user-not-found') {
                return NextResponse.json({ error: "No existe una cuenta con este correo" }, { status: 404 });
            }
            throw new Error(`Error de Firebase: ${authError.message}`);
        }

        // 2. Send the email using EmailJS REST API
        try {
            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    service_id: process.env.EMAILJS_SERVICE_ID,
                    template_id: process.env.EMAILJS_TEMPLATE_ID,
                    user_id: process.env.EMAILJS_PUBLIC_KEY,
                    accessToken: process.env.EMAILJS_PRIVATE_KEY,
                    template_params: {
                        to_email: email,
                        reset_link: resetLink,
                    },
                }),
            });

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text();
                console.error("EmailJS Error Response:", errorText);
                throw new Error(`EmailJS falló: ${errorText}`);
            }
        } catch (emailError: any) {
            console.error("EmailJS Fetch Error:", emailError);
            throw new Error(`Error enviando correo: ${emailError.message}`);
        }

        return NextResponse.json({ message: "Reset link sent successfully" });
    } catch (error: any) {
        console.error("Error in reset-link process:", error);

        return NextResponse.json({
            error: error.message || "Error al procesar la solicitud. Por favor intenta más tarde."
        }, { status: 500 });
    }
}
