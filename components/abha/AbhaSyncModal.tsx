"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface AbhaSyncModalProps {
  userId: Id<"users">;
  onClose: () => void;
  onLinked: () => void;
}

type Step = "ask" | "enter" | "confirm" | "success";

interface SandboxProfile {
  name: string;
  mobile: string;
  abha_id: string;
  abha_address: string;
  verification_token: string;
}

// Format ABHA ID input as user types: XX-XXXX-XXXX-XXXX
function formatAbhaId(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 6),
    digits.slice(6, 10),
    digits.slice(10, 14),
  ].filter(Boolean);
  return parts.join("-");
}

export default function AbhaSyncModal({ userId, onClose, onLinked }: AbhaSyncModalProps) {
  const [step, setStep] = useState<Step>("ask");
  const [abhaInput, setAbhaInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [linking, setLinking] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [profile, setProfile] = useState<SandboxProfile | null>(null);
  const [error, setError] = useState("");

  const linkAbhaMutation = useMutation(api.abha.linkAbha);

  const handleAbhaInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAbhaInput(formatAbhaId(e.target.value));
    setError("");
  };

  const handleVerify = async () => {
    if (abhaInput.replace(/-/g, "").length < 14) {
      setError("Please enter a complete 14-digit ABHA ID");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/abha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abha_id: abhaInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.detail?.message || "Verification failed. Please check your ABHA ID.");
        return;
      }
      setProfile(data);
      setStep("confirm");
    } catch {
      setError("Could not connect to ABHA sandbox. Is the backend running?");
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmLink = async () => {
    if (!profile) return;
    setLinking(true);
    setError("");
    try {
      // Call sandbox link endpoint
      const linkRes = await fetch("/api/abha/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abha_id: abhaInput, user_id: userId }),
      });
      if (!linkRes.ok) {
        setError("Sandbox linking failed. Please try again.");
        return;
      }

      // Persist in Convex
      await linkAbhaMutation({
        userId,
        abhaId: abhaInput,
        abhaName: profile.name,
        mobile: profile.mobile,
        autoSync,
      });

      setStep("success");
    } catch {
      setError("An error occurred while linking. Please try again.");
    } finally {
      setLinking(false);
    }
  };

  const stepContent = {
    ask: (
      <motion.div
        key="ask"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
      >
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Link Your ABHA ID
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            Securely link your{" "}
            <span className="text-emerald-600 font-semibold">
              Ayushman Bharat Health Account
            </span>{" "}
            to automatically sync your consultation reports and health records
            across all ABDM-connected providers.
          </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800 space-y-2">
          {["Auto-sync future consultation reports", "Access health records from any ABDM provider", "FHIR-compliant secure data exchange"].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              {f}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
            onClick={onClose}
          >
            Skip for Now
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
            onClick={() => setStep("enter")}
          >
            Link ABHA ID <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-zinc-400">
          🔒 Sandbox simulation — no real data is transmitted
        </p>
      </motion.div>
    ),

    enter: (
      <motion.div
        key="enter"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
      >
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-3">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">SANDBOX MODE</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Enter Your ABHA ID
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Format: <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">XX-XXXX-XXXX-XXXX</code>
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={abhaInput}
              onChange={handleAbhaInput}
              placeholder="14-4455-6678-9012"
              maxLength={17}
              className="w-full px-4 py-3.5 text-lg font-mono tracking-widest rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors text-center"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-xs text-zinc-500 dark:text-zinc-400">
            <p className="font-semibold mb-1">Try these sandbox IDs:</p>
            <div className="grid grid-cols-2 gap-1 font-mono">
              {["14-4455-6678-9012", "91-1234-5678-9000", "43-9876-5432-1001", "27-0011-2233-4455"].map((id) => (
                <button
                  key={id}
                  onClick={() => { setAbhaInput(id); setError(""); }}
                  className="text-left px-2 py-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 rounded transition-colors cursor-pointer"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-zinc-200 dark:border-zinc-700"
            onClick={() => setStep("ask")}
          >
            Back
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={handleVerify}
            disabled={verifying || abhaInput.replace(/-/g, "").length < 14}
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {verifying ? "Verifying…" : "Verify ID"}
          </Button>
        </div>
      </motion.div>
    ),

    confirm: (
      <motion.div
        key="confirm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6"
      >
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            ABHA ID Verified!
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Confirm the details below to complete linking.
          </p>
        </div>

        {profile && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {profile.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-zinc-900 dark:text-white text-lg">{profile.name}</p>
                <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">{abhaInput}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-800">
              <div>
                <p className="text-xs text-zinc-500">ABHA Address</p>
                <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">{profile.abha_address}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Mobile</p>
                <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{profile.mobile}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Auto-sync reports</p>
            <p className="text-xs text-zinc-500">Automatically sync new consultation reports</p>
          </div>
          <button onClick={() => setAutoSync(!autoSync)} className="text-emerald-600 dark:text-emerald-400">
            {autoSync
              ? <ToggleRight className="w-8 h-8" />
              : <ToggleLeft className="w-8 h-8 text-zinc-400" />
            }
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-zinc-200 dark:border-zinc-700"
            onClick={() => setStep("enter")}
            disabled={linking}
          >
            Back
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
            onClick={handleConfirmLink}
            disabled={linking}
          >
            {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {linking ? "Linking…" : "Confirm Link"}
          </Button>
        </div>
      </motion.div>
    ),

    success: (
      <motion.div
        key="success"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/40">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
            </motion.div>
          </div>
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">ABHA Linked!</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Your health records are now linked under{" "}
            <span className="font-mono text-emerald-600 font-semibold">{abhaInput}</span>
            {autoSync && ". Future consultation reports will auto-sync."}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800">
          <p className="text-xs text-zinc-500 mb-1">ABHA Address</p>
          <p className="font-mono text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
            {abhaInput.replace(/-/g, "")}@abdm
          </p>
          <p className="text-xs text-zinc-400 mt-2">🌐 Sandbox Environment</p>
        </div>

        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => { onLinked(); onClose(); }}
        >
          Go to Dashboard
        </Button>
      </motion.div>
    ),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step !== "success" ? onClose : undefined}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-zinc-100 dark:border-zinc-800"
      >
        {step !== "success" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Step indicators */}
        {["ask", "enter", "confirm"].includes(step) && (
          <div className="flex gap-1.5 mb-6 justify-center">
            {(["ask", "enter", "confirm"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s ? "w-8 bg-emerald-500" :
                  (["ask", "enter", "confirm"] as Step[]).indexOf(step) > i
                    ? "w-3 bg-emerald-300" : "w-3 bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {stepContent[step]}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
