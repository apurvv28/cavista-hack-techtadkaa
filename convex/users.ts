import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Ensures the Clerk user exists in our Convex database.
 * If they don't, we insert them. If they do, we update their details.
 */
export const syncUser = mutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        fullName: v.string(),
        role: v.union(v.literal("doctor"), v.literal("patient"), v.literal("unassigned"))
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (existingUser) {
            // Update existing user sync data
            return await ctx.db.patch(existingUser._id, {
                email: args.email,
                fullName: args.fullName,
                role: args.role,
            });
        }

        // Insert new user
        return await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            fullName: args.fullName,
            role: args.role,
        });
    },
});

/**
 * Assign a specific role to the currently logged in user.
 * (Replacing the old fetch('/api/set-role') mechanism).
 */
export const updateRole = mutation({
    args: {
        clerkId: v.string(),
        role: v.union(v.literal("doctor"), v.literal("patient")),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();

        if (!user) {
            throw new Error("User not found in Convex. Ensure they are synced first.");
        }

        await ctx.db.patch(user._id, {
            role: args.role,
        });

        return user._id;
    },
});

/**
 * Query the current user profile data based on their Clerk ID
 */
export const getUser = query({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .first();
    },
});

/**
 * Query all doctors in the system
 */
export const getDoctors = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "doctor"))
            .collect();
    },
});
/**
 * Query a user by their Convex ID
 */
export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});
