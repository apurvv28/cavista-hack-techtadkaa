import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("audio") as File;
        const patientName = formData.get("patientName") as string;

        if (!file || !patientName) {
            return NextResponse.json({ error: "Missing file or patient name" }, { status: 400 });
        }

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json({
                error: "BLOB_READ_WRITE_TOKEN is missing",
                details: "Please ensure the token is in your .env.local and restart the dev server."
            }, { status: 500 });
        }

        const sanitizedName = patientName.replace(/[^a-zA-Z0-9]/g, "");
        const fileName = `${sanitizedName}_${Date.now()}.webm`;

        // Convert File to Buffer for more reliable uploading
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const blob = await put(fileName, buffer, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: file.type || "audio/webm",
        });

        return NextResponse.json({ success: true, url: blob.url });
    } catch (error: any) {
        console.error("Error saving audio to Vercel Blob:", error);
        return NextResponse.json({
            error: "Failed to save audio",
            details: error.message || "Unknown error"
        }, { status: 500 });
    }
}
