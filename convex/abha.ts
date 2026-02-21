import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Link a patient's ABHA ID to their account.
 * Called after successful sandbox verification and user confirmation.
 */
export const linkAbha = mutation({
    args: {
        userId: v.id("users"),
        abhaId: v.string(),
        abhaName: v.string(),
        mobile: v.string(),
        autoSync: v.boolean(),
    },
    handler: async (ctx, args) => {
        // Check if user already has a link
        const existing = await ctx.db
            .query("abha_links")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (existing) {
            // Update existing link (re-linking with a different ABHA ID)
            return await ctx.db.patch(existing._id, {
                abhaId: args.abhaId,
                abhaName: args.abhaName,
                mobile: args.mobile,
                autoSync: args.autoSync,
                linkedAt: new Date().toISOString(),
            });
        }

        // Create new link
        return await ctx.db.insert("abha_links", {
            userId: args.userId,
            abhaId: args.abhaId,
            abhaName: args.abhaName,
            mobile: args.mobile,
            autoSync: args.autoSync,
            linkedAt: new Date().toISOString(),
            syncedReportIds: [],
            lastSyncAt: undefined,
        });
    },
});

/**
 * Update the auto-sync preference for an existing ABHA link.
 */
export const updateAutoSync = mutation({
    args: {
        userId: v.id("users"),
        autoSync: v.boolean(),
    },
    handler: async (ctx, args) => {
        const link = await ctx.db
            .query("abha_links")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!link) {
            throw new Error("No ABHA link found for this user.");
        }

        return await ctx.db.patch(link._id, { autoSync: args.autoSync });
    },
});

/**
 * Record that a consultation report has been synced to ABHA.
 */
export const addSyncedReport = mutation({
    args: {
        userId: v.id("users"),
        appointmentId: v.string(),
    },
    handler: async (ctx, args) => {
        const link = await ctx.db
            .query("abha_links")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (!link) {
            throw new Error("No ABHA link found for this user.");
        }

        // Add report if not already synced
        const alreadySynced = link.syncedReportIds.includes(args.appointmentId);
        if (!alreadySynced) {
            return await ctx.db.patch(link._id, {
                syncedReportIds: [...link.syncedReportIds, args.appointmentId],
                lastSyncAt: new Date().toISOString(),
            });
        }

        return link._id;
    },
});

/**
 * Get the ABHA link status for a user.
 * Returns null if not linked.
 */
export const getAbhaStatus = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("abha_links")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();
    },
});

/**
 * Get the list of synced report IDs for a user.
 */
export const getSyncedReports = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const link = await ctx.db
            .query("abha_links")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        return link?.syncedReportIds ?? [];
    },
});

/**
 * Unlink ABHA (patient request to disconnect)
 */
export const unlinkAbha = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const link = await ctx.db
            .query("abha_links")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (link) {
            await ctx.db.delete(link._id);
        }
    },
});
