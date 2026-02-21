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
