import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a direct appointment and slot the patient into the live queue.
 */
export const bookAppointment = mutation({
    args: {
        patientId: v.id("users"),
        doctorId: v.id("users"),
        type: v.union(v.literal("online"), v.literal("offline")),
        scheduledAt: v.string(),
    },
    handler: async (ctx, args) => {
        // 1. Insert the Appointment
        const appointmentId = await ctx.db.insert("appointments", {
            patientId: args.patientId,
            doctorId: args.doctorId,
            type: args.type,
            status: "scheduled",
            scheduledAt: args.scheduledAt,
        });

        // 2. Compute the Next Queue Index
        // Find the last person in this doctor's queue
        const lastInQueue = await ctx.db
            .query("queues")
            .withIndex("by_doctor_queue", (q) => q.eq("doctorId", args.doctorId))
            .order("desc")
            .first();

        const nextIndex = lastInQueue ? lastInQueue.queueIndex + 1 : 1;

        // 3. Add to Live Queue
        const queueId = await ctx.db.insert("queues", {
            doctorId: args.doctorId,
            patientId: args.patientId,
            appointmentId: appointmentId,
            queueIndex: nextIndex,
        });

        return {
            appointmentId,
            queueId,
            queueIndex: nextIndex,
            status: "scheduled",
        };
    },
});

/**
 * Get upcoming appointments for a user (either patient or doctor)
 */
export const getUpcomingAppointments = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const patientAppts = await ctx.db
            .query("appointments")
            .withIndex("by_patient", (q) => q.eq("patientId", args.userId))
            .filter((q) => q.eq(q.field("status"), "scheduled"))
            .collect();

        const doctorAppts = await ctx.db
            .query("appointments")
            .withIndex("by_doctor", (q) => q.eq("doctorId", args.userId))
            .filter((q) => q.eq(q.field("status"), "scheduled"))
            .collect();

        return [...patientAppts, ...doctorAppts].sort((a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
    },
});

/**
 * Get a single appointment by ID
 */
export const getAppointment = query({
    args: { appointmentId: v.id("appointments") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.appointmentId);
    },
});

/**
 * Mark appointment as completed, clear signaling, and remove from queue.
 */
export const completeAppointment = mutation({
    args: { appointmentId: v.id("appointments") },
    handler: async (ctx, args) => {
        // 1. Update status
        await ctx.db.patch(args.appointmentId, { status: "completed" });

        // 2. Clear Signaling
        const signals = await ctx.db
            .query("signaling")
            .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
            .collect();
        for (const s of signals) await ctx.db.delete(s._id);

        // 3. Remove from Queue
        // We'll search for the queue item by appointmentId
        const queueItem = await ctx.db
            .query("queues")
            .filter((q) => q.eq(q.field("appointmentId"), args.appointmentId))
            .first();

        if (queueItem) {
            await ctx.db.delete(queueItem._id);
        }
    },
});
