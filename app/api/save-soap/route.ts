import { NextRequest, NextResponse } from "next/server";

// Temporary in-memory store for SOAP data (use Convex in production)
const soapDataStore = new Map<string, any>();

/**
 * API endpoint for backend to POST SOAP notes
 * Backend calls this after processing audio, frontend retrieves and saves to Convex
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            appointmentId,
            transcription,
            soap,
            red_flags,
        } = body;

        if (!appointmentId || !transcription || !soap || !red_flags) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Store SOAP data for frontend to retrieve
        const soapNoteData = {
            appointmentId,
            transcription,
            soap,
            red_flags,
            generatedAt: new Date().toISOString(),
        };

        soapDataStore.set(appointmentId, soapNoteData);
        console.log("[API] SOAP data received:", appointmentId);

        return NextResponse.json({
            success: true,
            message: "SOAP note queued for saving",
            appointmentId,
        });
    } catch (error: any) {
        console.error("[API] Error processing SOAP:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process SOAP note" },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint for frontend to retrieve and clear SOAP data
 */
export async function GET(req: NextRequest) {
    try {
        const appointmentId = req.nextUrl.searchParams.get("appointmentId");

        if (!appointmentId) {
            return NextResponse.json(
                { error: "Missing appointmentId" },
                { status: 400 }
            );
        }

        const soapData = soapDataStore.get(appointmentId);
        if (soapData) {
            soapDataStore.delete(appointmentId);
        }

        return NextResponse.json({
            success: true,
            data: soapData || null,
        });
    } catch (error: any) {
        console.error("[API] Error retrieving SOAP:", error);
        return NextResponse.json(
            { error: error.message || "Failed to retrieve SOAP note" },
            { status: 500 }
        );
    }
}
