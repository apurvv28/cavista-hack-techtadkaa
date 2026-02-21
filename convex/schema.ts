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

    // ABHA (Ayushman Bharat Health Account) ID Linking
    abha_links: defineTable({
        userId: v.id("users"),                  // Reference to our Convex users table
        abhaId: v.string(),                      // 14-digit ABHA ID (XX-XXXX-XXXX-XXXX)
        abhaName: v.string(),                    // Sandbox-returned patient display name
        mobile: v.string(),                      // Last 4 digits of registered mobile
        linkedAt: v.string(),                    // ISO string timestamp of linking
        autoSync: v.boolean(),                   // Whether to auto-sync new reports
        syncedReportIds: v.array(v.string()),    // List of appointment IDs synced to ABHA
        lastSyncAt: v.optional(v.string()),      // ISO string of last sync
    })
        .index("by_user", ["userId"])
        .index("by_abha_id", ["abhaId"]),
});
