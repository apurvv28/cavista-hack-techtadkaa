import { NextRequest, NextResponse } from "next/server";
import { validateAbhaFormat, getSandboxProfile } from "@/lib/abha-sandbox";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
    try {
        const { abha_id, user_id } = await req.json();

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
        const accessToken = `sandbox_token_${randomBytes(8).toString("hex")}`;

        return NextResponse.json({
            status: "LINKED",
            sandbox: true,
            abha_id,
            abha_address: `${abha_id.replace(/-/g, "")}@abdm`,
            patient_name: profile.name,
            mobile: profile.mobile,
            linked_at: new Date().toISOString(),
            access_token: accessToken,
            message: "ABHA ID successfully linked to Smart EMR (Sandbox)",
        });
    } catch (error) {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
}
