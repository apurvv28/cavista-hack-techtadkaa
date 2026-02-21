import { NextRequest, NextResponse } from "next/server";
import { validateAbhaFormat, getSandboxProfile, getVerificationToken } from "@/lib/abha-sandbox";

export async function POST(req: NextRequest) {
    try {
        const { abha_id } = await req.json();

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

        return NextResponse.json({
            status: "SUCCESS",
            sandbox: true,
            abha_id,
            abha_address: `${abha_id.replace(/-/g, "")}@abdm`,
            name: profile.name,
            gender: profile.gender,
            dob: profile.dob,
            mobile: profile.mobile,
            verification_token: getVerificationToken(abha_id),
        });
    } catch (error) {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
}
