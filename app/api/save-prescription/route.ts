import { put } from "@vercel/blob";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";

type MedicineRow = {
    medicine: string;
    dosage: string;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
};

async function buildPrescriptionPdf(args: {
    doctorName: string;
    doctorEmail: string;
    doctorPhone: string;
    patientId: string;
    patientName: string;
    patientAge: string;
    patientWeight: string;
    prescriptionDate: string;
    medicines: MedicineRow[];
}) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 portrait

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const marginX = 48;
    let y = 794;

    page.drawText("PRESCRIPTION", {
        x: marginX,
        y,
        size: 22,
        font: boldFont,
        color: rgb(0.09, 0.09, 0.11),
    });
    y -= 28;

    page.drawText(`Dr. ${args.doctorName || "Doctor"}`, {
        x: marginX,
        y,
        size: 13,
        font: boldFont,
        color: rgb(0.14, 0.14, 0.16),
    });
    y -= 18;

    page.drawText(`Contact: ${args.doctorEmail || "-"} | ${args.doctorPhone || "-"}`, {
        x: marginX,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.35),
    });
    y -= 20;

    page.drawLine({
        start: { x: marginX, y },
        end: { x: 595 - marginX, y },
        thickness: 1,
        color: rgb(0.85, 0.85, 0.88),
    });
    y -= 26;

    page.drawText(`Patient ID: ${args.patientId || "-"}`, {
        x: marginX,
        y,
        size: 11,
        font: boldFont,
    });

    page.drawText(`Date: ${args.prescriptionDate || "-"}`, {
        x: 380,
        y,
        size: 11,
        font: boldFont,
    });
    y -= 20;

    page.drawText(`Patient Name: ${args.patientName || "-"}`, {
        x: marginX,
        y,
        size: 10,
        font,
    });
    y -= 16;

    page.drawText(`Age: ${args.patientAge || "-"}    Weight: ${args.patientWeight || "-"} kg`, {
        x: marginX,
        y,
        size: 10,
        font,
    });
    y -= 28;

    page.drawText("Prescription", {
        x: marginX,
        y,
        size: 13,
        font: boldFont,
    });
    y -= 20;

    const headers = ["#", "Medicine", "Dosage", "Morning", "Afternoon", "Evening"];
    const colX = [marginX, marginX + 26, marginX + 230, marginX + 355, marginX + 430, marginX + 510];

    headers.forEach((header, i) => {
        page.drawText(header, {
            x: colX[i],
            y,
            size: 9,
            font: boldFont,
            color: rgb(0.2, 0.2, 0.24),
        });
    });
    y -= 10;

    page.drawLine({
        start: { x: marginX, y },
        end: { x: 595 - marginX, y },
        thickness: 0.7,
        color: rgb(0.85, 0.85, 0.88),
    });
    y -= 14;

    args.medicines.forEach((item, index) => {
        if (y < 80) {
            return;
        }

        page.drawText(String(index + 1), {
            x: colX[0],
            y,
            size: 9,
            font,
        });

        page.drawText(item.medicine || "-", {
            x: colX[1],
            y,
            size: 9,
            font,
            maxWidth: 190,
        });

        page.drawText(item.dosage || "-", {
            x: colX[2],
            y,
            size: 9,
            font,
            maxWidth: 110,
        });

        page.drawText(item.morning ? "Yes" : "-", {
            x: colX[3],
            y,
            size: 9,
            font,
        });
        page.drawText(item.afternoon ? "Yes" : "-", {
            x: colX[4],
            y,
            size: 9,
            font,
        });
        page.drawText(item.evening ? "Yes" : "-", {
            x: colX[5],
            y,
            size: 9,
            font,
        });

        y -= 16;
    });

    y -= 12;
    page.drawLine({
        start: { x: marginX, y },
        end: { x: 595 - marginX, y },
        thickness: 0.7,
        color: rgb(0.85, 0.85, 0.88),
    });
    y -= 24;

    page.drawText("Doctor Signature: __________________________", {
        x: marginX,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.35),
    });

    return await pdfDoc.save();
}

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
        const fileName = `prescription_${cleanPatientId || "pid"}_${cleanPatientName || "patient"}_${Date.now()}.pdf`;

        const pdfBytes = await buildPrescriptionPdf({
            doctorName: doctorName || "Doctor",
            doctorEmail: doctorEmail || "-",
            doctorPhone: doctorPhone || "-",
            patientId: String(patientId || "-"),
            patientName: String(patientName || "-"),
            patientAge: String(patientAge || "-"),
            patientWeight: String(patientWeight || "-"),
            prescriptionDate: String(prescriptionDate || "-"),
            medicines: medicines as MedicineRow[],
        });

        const blob = await put(fileName, Buffer.from(pdfBytes), {
            access: "public",
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: "application/pdf",
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
