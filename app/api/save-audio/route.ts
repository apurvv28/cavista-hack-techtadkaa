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

        const sanitizedName = patientName.replace(/[^a-zA-Z0-9]/g, "");
        const fileName = `${sanitizedName}_${Date.now()}.webm`;

        const blob = await put(fileName, file, {
            access: "public",
        });

        return NextResponse.json({ success: true, url: blob.url });
    } catch (error) {
        console.error("Error saving audio to Vercel Blob:", error);
        return NextResponse.json({ error: "Failed to save audio" }, { status: 500 });
    }
}
