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
});
