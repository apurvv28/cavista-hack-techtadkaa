import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send a signaling message (offer, answer, or ICE candidate)
 */
export const sendSignal = mutation({
    args: {
        appointmentId: v.id("appointments"),
        senderId: v.id("users"),
        type: v.union(v.literal("offer"), v.literal("answer"), v.literal("candidate")),
        payload: v.string(),
    },
    handler: async (ctx, args) => {
        // We only allow one offer/answer active, but many candidates
        if (args.type === "offer" || args.type === "answer") {
            const existing = await ctx.db
                .query("signaling")
                .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
                .filter((q) => q.eq(q.field("type"), args.type))
                .first();

            if (existing) {
                await ctx.db.delete(existing._id);
            }
        }

        return await ctx.db.insert("signaling", {
            appointmentId: args.appointmentId,
            senderId: args.senderId,
            type: args.type,
            payload: args.payload,
        });
    },
});

/**
 * Get all signals for an appointment (for the other party to listen to)
 */
export const getSignals = query({
    args: { appointmentId: v.id("appointments") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("signaling")
            .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
            .collect();
    },
});

/**
 * Clear all signals for an appointment after the call ends
 */
export const clearSignals = mutation({
    args: { appointmentId: v.id("appointments") },
    handler: async (ctx, args) => {
        const signals = await ctx.db
            .query("signaling")
            .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
            .collect();

        for (const signal of signals) {
            await ctx.db.delete(signal._id);
        }
    },
});

/**
 * Save the final transcript of the consultation
 */
export const saveTranscript = mutation({
    args: {
        appointmentId: v.id("appointments"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("transcripts", {
            appointmentId: args.appointmentId,
            content: args.content,
            generatedAt: new Date().toISOString(),
        });
    },
});

/**
 * Get the transcript for a consultation
 */
export const getTranscript = query({
    args: { appointmentId: v.id("appointments") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("transcripts")
            .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
            .first();
    },
});

/**
 * Save SOAP notes and red flags generated from backend processing
 */
export const saveSoapNote = mutation({
    args: {
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
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("soap_notes", {
            appointmentId: args.appointmentId,
            transcription: args.transcription,
            soap: args.soap,
            red_flags: args.red_flags,
            generatedAt: new Date().toISOString(),
        });
    },
});

/**
 * Get SOAP note for a consultation
 */
export const getSoapNote = query({
    args: { appointmentId: v.id("appointments") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("soap_notes")
            .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
            .first();
    },
});
