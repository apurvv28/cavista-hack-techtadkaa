import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

type MedicineRow = {
    medicine: string;
    dosage: string;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
};

export async function POST(req: NextRequest) {
    try {
        const {
            doctorName,
            doctorEmail,
            doctorPhone,
            patientId,
            patientName,
            patientAge,
            patientWeight,
            prescriptionDate,
            medicines,
        } = await req.json();

        if (!patientId || !patientName || !prescriptionDate || !Array.isArray(medicines)) {
            return NextResponse.json(
                { error: "Missing required prescription fields" },
                { status: 400 },
            );
        }

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json(
                {
                    error: "BLOB_READ_WRITE_TOKEN is missing",
                    details:
                        "Please add BLOB_READ_WRITE_TOKEN to .env.local and restart the app.",
                },
                { status: 500 },
            );
        }

        const cleanPatientName = String(patientName).replace(/[^a-zA-Z0-9]/g, "");
        const cleanPatientId = String(patientId).replace(/[^a-zA-Z0-9_-]/g, "");
        const fileName = `prescription_${cleanPatientId || "pid"}_${cleanPatientName || "patient"}_${Date.now()}.txt`;

        const lines = [
            `Doctor: ${doctorName || "-"}`,
            `Doctor Email: ${doctorEmail || "-"}`,
            `Doctor Phone: ${doctorPhone || "-"}`,
            "",
            `Patient ID: ${patientId || "-"}`,
            `Patient Name: ${patientName || "-"}`,
            `Patient Age: ${patientAge || "-"}`,
            `Patient Weight: ${patientWeight || "-"}`,
            `Date: ${prescriptionDate || "-"}`,
            "",
            "Prescription:",
            ...((medicines as MedicineRow[]).map((item, index) => {
                const slots = [
                    item.morning ? "Morning" : "",
                    item.afternoon ? "Afternoon" : "",
                    item.evening ? "Evening" : "",
                ]
                    .filter(Boolean)
                    .join(", ");

                return `${index + 1}. Medicine: ${item.medicine || "-"} | Dosage: ${item.dosage || "-"} | Time: ${slots || "-"}`;
            }) || []),
        ];

        const content = lines.join("\n");

        const blob = await put(fileName, content, {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: "text/plain; charset=utf-8",
        });

        return NextResponse.json({ success: true, url: blob.url });
    } catch (error: any) {
        console.error("Error saving prescription to Vercel Blob:", error);
        return NextResponse.json(
            {
                error: "Failed to save prescription",
                details: error?.message || "Unknown error",
            },
            { status: 500 },
        );
    }
}
