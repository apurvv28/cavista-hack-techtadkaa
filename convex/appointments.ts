import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CONSULTATION_MINUTES_PER_PATIENT = 30;

async function rebuildDoctorQueue(ctx: any, doctorId: any) {
    const queueItems = await ctx.db
        .query("queues")
        .withIndex("by_doctor_queue", (q: any) => q.eq("doctorId", doctorId))
        .collect();

    const enriched = await Promise.all(
        queueItems.map(async (queueItem: any) => {
            const appointment = await ctx.db.get(queueItem.appointmentId);
            const riskScore = typeof appointment?.patientRiskScore === "number"
                ? appointment.patientRiskScore
                : 0;

            return {
                queueItem,
                appointment,
                riskScore,
            };
        }),
    );

    const active = enriched.filter(({ appointment }: any) => appointment?.status === "scheduled");

    active.sort((a: any, b: any) => {
        if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;

        const aTime = new Date(a.appointment.scheduledAt).getTime();
        const bTime = new Date(b.appointment.scheduledAt).getTime();
        if (aTime !== bTime) return aTime - bTime;

        return a.queueItem._creationTime - b.queueItem._creationTime;
    });

    for (let i = 0; i < active.length; i += 1) {
        const nextQueueIndex = i + 1;
        if (active[i].queueItem.queueIndex !== nextQueueIndex) {
            await ctx.db.patch(active[i].queueItem._id, { queueIndex: nextQueueIndex });
        }
    }
}

/**
 * Create a direct appointment and slot the patient into the live queue.
 */
export const bookAppointment = mutation({
    args: {
        patientId: v.id("users"),
        doctorId: v.id("users"),
        type: v.union(v.literal("online"), v.literal("offline")),
        scheduledAt: v.string(),
        patientRiskScore: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // 1. Insert the Appointment
        const appointmentId = await ctx.db.insert("appointments", {
            patientId: args.patientId,
            doctorId: args.doctorId,
            type: args.type,
            status: "scheduled",
            scheduledAt: args.scheduledAt,
            patientRiskScore: args.patientRiskScore,
        });

        // 2. Add to queue with temporary index and then rebalance by risk.
        const queueId = await ctx.db.insert("queues", {
            doctorId: args.doctorId,
            patientId: args.patientId,
            appointmentId: appointmentId,
            queueIndex: 999999,
        });

        // 3. Rebuild queue order using risk score desc, then scheduled time asc.
        await rebuildDoctorQueue(ctx, args.doctorId);

        const queueItem = await ctx.db.get(queueId);
        const queueIndex = queueItem?.queueIndex ?? 1;
        const estimatedWaitMinutes = Math.max(0, (queueIndex - 1) * CONSULTATION_MINUTES_PER_PATIENT);

        return {
            appointmentId,
            queueId,
            queueIndex,
            estimatedWaitMinutes,
            status: "scheduled",
        };
    },
});

export const updateAppointmentRiskScore = mutation({
    args: {
        appointmentId: v.id("appointments"),
        patientRiskScore: v.number(),
    },
    handler: async (ctx, args) => {
        const appointment = await ctx.db.get(args.appointmentId);
        if (!appointment) throw new Error("Appointment not found");

        const normalizedRisk = Math.max(0, Math.min(100, Math.round(args.patientRiskScore)));

        await ctx.db.patch(args.appointmentId, {
            patientRiskScore: normalizedRisk,
        });

        await rebuildDoctorQueue(ctx, appointment.doctorId);

        const queueItem = await ctx.db
            .query("queues")
            .withIndex("by_doctor_queue", (q) => q.eq("doctorId", appointment.doctorId))
            .filter((q) => q.eq(q.field("appointmentId"), args.appointmentId))
            .first();

        const queueIndex = queueItem?.queueIndex ?? 1;
        return {
            appointmentId: args.appointmentId,
            patientRiskScore: normalizedRisk,
            queueIndex,
            estimatedWaitMinutes: Math.max(0, (queueIndex - 1) * CONSULTATION_MINUTES_PER_PATIENT),
        };
    },
});

export const getDoctorQueue = query({
    args: { doctorId: v.id("users") },
    handler: async (ctx, args) => {
        const queueItems = await ctx.db
            .query("queues")
            .withIndex("by_doctor_queue", (q) => q.eq("doctorId", args.doctorId))
            .collect();

        const rows = await Promise.all(
            queueItems.map(async (queueItem) => {
                const appointment = await ctx.db.get(queueItem.appointmentId);
                if (!appointment || appointment.status !== "scheduled") return null;
                const patient = await ctx.db.get(queueItem.patientId);

                const estimatedWaitMinutes = Math.max(
                    0,
                    (queueItem.queueIndex - 1) * CONSULTATION_MINUTES_PER_PATIENT,
                );

                return {
                    queueId: queueItem._id,
                    queueIndex: queueItem.queueIndex,
                    estimatedWaitMinutes,
                    estimatedStartAt: new Date(Date.now() + estimatedWaitMinutes * 60 * 1000).toISOString(),
                    appointment,
                    patient,
                    patientRiskScore: appointment.patientRiskScore ?? 0,
                };
            }),
        );

        return rows.filter(Boolean).sort((a: any, b: any) => a.queueIndex - b.queueIndex);
    },
});

export const getPatientQueueStatus = query({
    args: { patientId: v.id("users") },
    handler: async (ctx, args) => {
        const patientAppointments = await ctx.db
            .query("appointments")
            .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
            .filter((q) => q.eq(q.field("status"), "scheduled"))
            .collect();

        if (!patientAppointments.length) return null;

        patientAppointments.sort(
            (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        );

        const activeAppointment = patientAppointments[0];
        const queueItem = await ctx.db
            .query("queues")
            .withIndex("by_patient_queue", (q) => q.eq("patientId", args.patientId))
            .filter((q) => q.eq(q.field("appointmentId"), activeAppointment._id))
            .first();

        if (!queueItem) return null;

        const estimatedWaitMinutes = Math.max(
            0,
            (queueItem.queueIndex - 1) * CONSULTATION_MINUTES_PER_PATIENT,
        );

        return {
            appointmentId: activeAppointment._id,
            doctorId: activeAppointment.doctorId,
            consultationType: activeAppointment.type,
            queueIndex: queueItem.queueIndex,
            patientRiskScore: activeAppointment.patientRiskScore ?? 0,
            estimatedWaitMinutes,
            estimatedStartAt: new Date(Date.now() + estimatedWaitMinutes * 60 * 1000).toISOString(),
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
        const appointment = await ctx.db.get(args.appointmentId);
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

        if (appointment) {
            await rebuildDoctorQueue(ctx, appointment.doctorId);
        }
    },
});
