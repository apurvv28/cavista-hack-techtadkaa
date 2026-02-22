"use client";

import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { PrescriptionForm } from "@/components/documents/PrescriptionForm";

export default function DocumentsPage() {
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

          <PrescriptionForm />
        </motion.div>
      </div>
    </div>
  );
}
