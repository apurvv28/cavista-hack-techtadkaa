"use client";

import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { PrescriptionForm } from "@/components/documents/PrescriptionForm";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DocumentsPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip",
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Online Prescription
            </h1>
          </div>

          {convexUser?.role === "doctor" ? (
            <PrescriptionForm />
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                Only doctors can view and manage prescriptions.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
