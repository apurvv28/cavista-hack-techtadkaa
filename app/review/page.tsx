"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function ReviewPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Review & Dispatch</h1>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400 mb-8">
              The Review Agent cross-references generated notes against original dictation, flagging hallucinations and generating patient-friendly summaries.
            </p>
            
            <div className="h-64 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
              <span className="text-zinc-400 font-medium">Hallucination guard review interface coming soon</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
