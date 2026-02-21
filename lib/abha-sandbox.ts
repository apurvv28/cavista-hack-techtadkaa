/**
 * ABHA Sandbox Simulation Library
 * Mirrors the real ABDM API contract without making any external requests.
 * All responses are deterministic based on the ABHA ID prefix.
 */

import crypto from "crypto";

// Deterministic mock profiles keyed by the first 2 digits of the ABHA ID
export const ABHA_SANDBOX_PROFILES: Record<
    string,
    { name: string; gender: string; dob: string; mobile: string }
> = {
    "14": { name: "Aarav Sharma", gender: "M", dob: "1990-05-14", mobile: "XXXXXX7823" },
    "91": { name: "Priya Nair", gender: "F", dob: "1985-11-22", mobile: "XXXXXX4512" },
    "43": { name: "Rohan Mehta", gender: "M", dob: "1995-03-08", mobile: "XXXXXX6634" },
    "27": { name: "Kavitha Reddy", gender: "F", dob: "1978-07-30", mobile: "XXXXXX1190" },
    "56": { name: "Arjun Patel", gender: "M", dob: "2001-01-15", mobile: "XXXXXX3356" },
    "78": { name: "Sunita Agarwal", gender: "F", dob: "1968-09-03", mobile: "XXXXXX8821" },
    "33": { name: "Vikram Singh", gender: "M", dob: "1992-06-19", mobile: "XXXXXX5547" },
    "66": { name: "Meera Krishnamurti", gender: "F", dob: "1983-12-25", mobile: "XXXXXX2293" },
};

const DEFAULT_PROFILE = {
    name: "Test Patient",
    gender: "M",
    dob: "1995-01-01",
    mobile: "XXXXXX0000",
};

/** Validate ABHA ID format: XX-XXXX-XXXX-XXXX */
export function validateAbhaFormat(abhaId: string): boolean {
    return /^\d{2}-\d{4}-\d{4}-\d{4}$/.test(abhaId);
}

/** Return a deterministic sandbox profile based on the first 2 digits */
export function getSandboxProfile(abhaId: string) {
    const prefix = abhaId.slice(0, 2);
    return ABHA_SANDBOX_PROFILES[prefix] ?? DEFAULT_PROFILE;
}

/** Generate a deterministic verification token for a given ABHA ID */
export function getVerificationToken(abhaId: string): string {
    return crypto
        .createHash("sha256")
        .update(`sandbox-${abhaId}-verify`)
        .digest("hex")
        .slice(0, 32);
}

/** In-memory sandbox records store (persists for the lifetime of the Next.js server process) */
export const sandboxRecords: Map<string, SandboxRecord[]> = new Map();

export interface SandboxRecord {
    transaction_id: string;
    report_id: string;
    report_type: string;
    appointment_date: string;
    soap_summary: string;
    doctor_name: string;
    synced_at: string;
    fhir_resource_id: string;
    health_locker: string;
}
