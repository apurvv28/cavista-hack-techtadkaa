import { NextRequest, NextResponse } from "next/server";
import { validateAbhaFormat, sandboxRecords, SandboxRecord } from "@/lib/abha-sandbox";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            abha_id,
            report_id,
            appointment_date,
            soap_summary,
            doctor_name = "Dr. (Sandbox)",
            report_type = "Consultation",
        } = body;

        if (!abha_id || !validateAbhaFormat(abha_id)) {
            return NextResponse.json(
                {
                    code: "ABHA_INVALID_FORMAT",
                    message: "Invalid ABHA ID format. Must be XX-XXXX-XXXX-XXXX (14 digits).",
                },
                { status: 422 }
            );
        }

        const transactionId = `TXN-${randomBytes(6).toString("hex").toUpperCase()}`;
        const fhirResourceId = `doc-ref-${randomBytes(4).toString("hex")}`;

        const record: SandboxRecord = {
            transaction_id: transactionId,
            report_id: report_id ?? `rpt-${Date.now()}`,
            report_type,
            appointment_date: appointment_date ?? new Date().toISOString(),
            soap_summary: (soap_summary ?? "").slice(0, 200),
            doctor_name,
            synced_at: new Date().toISOString(),
            fhir_resource_id: fhirResourceId,
            health_locker: "NHA-SANDBOX-LOCKER-01",
        };

        const existing = sandboxRecords.get(abha_id) ?? [];
        sandboxRecords.set(abha_id, [...existing, record]);

        return NextResponse.json({
            status: "SYNCED",
            sandbox: true,
            abha_id,
            transaction_id: transactionId,
            fhir_resource_id: fhirResourceId,
            health_locker: record.health_locker,
            message: `Report synced to ABHA PHR successfully (Sandbox). Transaction: ${transactionId}`,
        });
    } catch (error) {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
}
