"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserCircle, Stethoscope, HeartPulse, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DoctorDashboard from "@/components/dashboard/DoctorDashboard";
import PatientDashboard from "@/components/dashboard/PatientDashboard";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const { user, isLoaded: clerkLoaded } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);

  // Query Convex for the user's synced data
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const updateRoleMutation = useMutation(api.users.updateRole);
  const syncUserMutation = useMutation(api.users.syncUser);

  // Fallback to loading state if Clerk or Convex hasn't initialized yet
  if (!clerkLoaded || (user && convexUser === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if we have an authoritative Role assigned via Convex
  // Note: if user is not fully synced to Convex yet, convexUser might be null.
  const convexRole = convexUser?.role;
  const hasAssignedRole = convexRole === "doctor" || convexRole === "patient";

  // The function to permanently assign a role using our Convex Mutation
  const handleRoleSelection = async (role: "doctor" | "patient") => {
    if (!user) return;
    setIsUpdating(true);
    try {
      // First ensure the user exists in Convex
      await syncUserMutation({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        fullName: user.fullName || "New User",
        role: "unassigned",
      });

      // Then update their role
      await updateRoleMutation({
        clerkId: user.id,
        role: role,
      });
    } catch (e) {
      console.error("Failed to update role in Convex:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!hasAssignedRole) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl w-full text-center space-y-10"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
              <HeartPulse className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Welcome to Smart EMR
            </h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              Please select your account type. This will be permanently saved to
              your profile for future automatic logins!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Card
                className="cursor-pointer border border-zinc-200/80 hover:border-zinc-300 transition-colors bg-white/90 backdrop-blur-sm dark:bg-zinc-900 shadow-sm hover:shadow-md relative rounded-3xl"
                onClick={() => !isUpdating && handleRoleSelection("doctor")}
              >
                <CardContent className="p-10 flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-primary/10 rounded-2xl">
                    <Stethoscope className="w-12 h-12 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    I am a Doctor
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    Access clinical analytics, review AI-generated SOAP notes,
                    and manage your patient queue.
                  </p>
                  <Button
                    disabled={isUpdating}
                    className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center gap-2"
                  >
                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enter Provider Portal
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Card
                className="cursor-pointer border border-zinc-200/80 hover:border-zinc-300 transition-colors bg-white/90 backdrop-blur-sm dark:bg-zinc-900 shadow-sm hover:shadow-md relative rounded-3xl"
                onClick={() => !isUpdating && handleRoleSelection("patient")}
              >
                <CardContent className="p-10 flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-primary/10 rounded-2xl">
                    <UserCircle className="w-12 h-12 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    I am a Patient
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    View your upcoming appointments, access plain-language visit
                    summaries, and manage active prescriptions.
                  </p>
                  <Button
                    disabled={isUpdating}
                    variant="outline"
                    className="w-full mt-4 border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-2"
                  >
                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enter Patient Portal
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // If a role is strictly found in Clerk MetaData, route them automatically!
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-zinc-950 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          key={convexRole}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {convexRole === "doctor" ? <DoctorDashboard /> : <PatientDashboard />}
        </motion.div>
      </div>
    </div>
  );
}
