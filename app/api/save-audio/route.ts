import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("audio") as File;
        const patientName = formData.get("patientName") as string;
        const appointmentId = formData.get("appointmentId") as string | null;

        if (!file || !patientName) {
            return NextResponse.json({ error: "Missing file or patient name" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // ── 1. Forward audio to FastAPI backend for SOAP + Red Flag processing ──
        let soapResult: any = null;
        try {
            const backendForm = new FormData();
            const audioBlob = new Blob([buffer], { type: file.type || "audio/webm" });
            backendForm.append("file", audioBlob, file.name || "audio.webm");
            if (appointmentId) {
                backendForm.append("appointment_id", appointmentId);
                // Tell backend to POST results back to our Next.js /api/save-soap
                backendForm.append("frontend_base_url", "http://localhost:3000");
            }

            const backendRes = await fetch(`${BACKEND_URL}/upload-audio`, {
                method: "POST",
                body: backendForm,
            });

            if (backendRes.ok) {
                soapResult = await backendRes.json();
                console.log("[save-audio] FastAPI SOAP result received:", appointmentId);
            } else {
                const err = await backendRes.text();
                console.error("[save-audio] FastAPI error:", err);
            }
        } catch (e: any) {
            console.error("[save-audio] Could not reach FastAPI backend:", e.message);
        }

        // ── 2. Try Vercel Blob upload (optional — only if token is present) ──
        let blobUrl: string | null = null;
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            try {
                const { put } = await import("@vercel/blob");
                const sanitizedName = patientName.replace(/[^a-zA-Z0-9]/g, "");
                const fileName = `${sanitizedName}_${Date.now()}.webm`;
                const blob = await put(fileName, buffer, {
                    access: "public",
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                    contentType: file.type || "audio/webm",
                });
                blobUrl = blob.url;
                console.log("[save-audio] Audio stored in Vercel Blob:", blobUrl);
            } catch (e: any) {
                console.error("[save-audio] Vercel Blob upload failed:", e.message);
            }
        } else {
            console.log("[save-audio] BLOB_READ_WRITE_TOKEN not set — skipping Vercel Blob upload.");
        }

        return NextResponse.json({
            success: true,
            url: blobUrl,
            soap: soapResult,
            message: blobUrl
                ? "Audio stored and SOAP generated"
                : "SOAP generated (no blob storage configured)",
        });
    } catch (error: any) {
        console.error("Error in save-audio route:", error);
        return NextResponse.json(
            { error: "Failed to process audio", details: error.message || "Unknown error" },
            { status: 500 }
        );
    }
}
