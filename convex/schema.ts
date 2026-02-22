import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(), // The primary link to Clerk authentication
        email: v.string(),
        fullName: v.string(),
        role: v.union(v.literal("doctor"), v.literal("patient"), v.literal("unassigned")),
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_role", ["role"]),

    appointments: defineTable({
        patientId: v.id("users"), // Reference to our Convex users table
        doctorId: v.id("users"),
        status: v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled")),
        type: v.union(v.literal("online"), v.literal("offline")),
        scheduledAt: v.string(), // ISO string format
    })
        .index("by_doctor", ["doctorId"])
        .index("by_patient", ["patientId"]),

    queues: defineTable({
        doctorId: v.id("users"),
        patientId: v.id("users"),
        appointmentId: v.id("appointments"),
        queueIndex: v.number(),
    })
        .index("by_doctor_queue", ["doctorId", "queueIndex"]),

    // WebRTC Signaling for Video Consultation
    signaling: defineTable({
        appointmentId: v.id("appointments"),
        senderId: v.id("users"),
        type: v.union(v.literal("offer"), v.literal("answer"), v.literal("candidate")),
        payload: v.string(), // JSON stringified RTCData
    })
        .index("by_appointment", ["appointmentId"]),

    // Consultation Transcripts
    transcripts: defineTable({
        appointmentId: v.id("appointments"),
        content: v.string(),
        generatedAt: v.string(),
    })
        .index("by_appointment", ["appointmentId"]),

    // SOAP Notes (generated from transcripts via backend)
    soap_notes: defineTable({
        appointmentId: v.id("appointments"),
        transcription: v.string(),
        soap: v.object({
            chief_complaint: v.string(),
            history_of_present_illness: v.string(),
            past_medical_history: v.string(),
            medications: v.string(),
            allergies: v.string(),
            vitals: v.object({
                blood_pressure: v.string(),
                heart_rate: v.string(),
                respiratory_rate: v.string(),
                temperature: v.string(),
                oxygen_saturation: v.string(),
            }),
            objective_findings: v.string(),
            assessment: v.string(),
            plan: v.string(),
        }),
        red_flags: v.object({
            alerts: v.array(
                v.object({
                    type: v.string(),
                    severity: v.union(v.literal("moderate"), v.literal("high"), v.literal("critical")),
                    reason: v.string(),
                    recommended_action: v.string(),
                })
            ),
            alert_count: v.number(),
        }),
        generatedAt: v.string(),
    })
        .index("by_appointment", ["appointmentId"]),

    // Prescription documents stored in Vercel Blob with user linkage
    prescriptions: defineTable({
        doctorId: v.id("users"),
        doctorClerkId: v.string(),
        doctorName: v.string(),
        doctorEmail: v.string(),
        patientId: v.string(),
        patientName: v.string(),
        patientAge: v.string(),
        patientWeight: v.string(),
        prescriptionDate: v.string(),
        blobUrl: v.string(),
        medicines: v.array(
            v.object({
                medicine: v.string(),
                dosage: v.string(),
                morning: v.boolean(),
                afternoon: v.boolean(),
                evening: v.boolean(),
            }),
        ),
        createdAt: v.string(),
    })
        .index("by_doctor", ["doctorId"])
        .index("by_doctor_clerk_id", ["doctorClerkId"])
        .index("by_patient_id", ["patientId"]),
});
