import { NextRequest, NextResponse } from "next/server";
import { validateAbhaFormat, getSandboxProfile, sandboxRecords } from "@/lib/abha-sandbox";

export async function GET(
    req: NextRequest,
    { params }: { params: { abha_id: string } }
) {
    const { abha_id } = params;

    if (!abha_id || !validateAbhaFormat(abha_id)) {
        return NextResponse.json(
            {
                code: "ABHA_INVALID_FORMAT",
                message: "Invalid ABHA ID format. Must be XX-XXXX-XXXX-XXXX (14 digits).",
            },
            { status: 422 }
        );
    }

    const profile = getSandboxProfile(abha_id);
    const records = sandboxRecords.get(abha_id) ?? [];

    return NextResponse.json({
        status: "SUCCESS",
        sandbox: true,
        abha_id,
        patient_name: profile.name,
        total_records: records.length,
        records,
    });
}
