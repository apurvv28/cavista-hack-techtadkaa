"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Mic, MicOff, Upload, Loader2,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type PipelineResult = {
  transcription?: string;
  soap?: Record<string, any>;
  red_flags?: Record<string, any>;
  icd_mappings?: any[];
  summary_text?: string;
  report_link?: string;
  qr_code_base64?: string;
  email_status?: string;
  risk_status?: string;
  steps_completed?: string[];
  errors?: string[];
};

const SECTIONS = [
  { key: "transcription", label: "📝 Transcription" },
  { key: "soap", label: "🩺 SOAP Notes" },
  { key: "red_flags", label: "⚠️ Red Flags" },
  { key: "icd_mappings", label: "🔬 ICD-10 Mappings" },
  { key: "summary_text", label: "📋 Patient Summary" },
];

export default function ConsultationPage() {
  // ── Patient Info ──────────────────────────────────────────────────────
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("P001");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [doctorName, setDoctorName] = useState("Dr. Smith");
  const [clinicName, setClinicName] = useState("Smart EMR");
  const [language, setLanguage] = useState("English");

  // ── Recording State ───────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>("transcription");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Recording helpers ─────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e: any) {
      setError("Microphone access denied: " + e.message);
    }
  };

  const stopAndProcess = async () => {
    setIsRecording(false);
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    await new Promise<void>((res) => { recorder.onstop = () => res(); recorder.stop(); recorder.stream.getTracks().forEach(t => t.stop()); });
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    await runPipeline(blob, "recording.webm");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await runPipeline(f, f.name);
    e.target.value = "";
  };

  // ── Core: call /full-pipeline ─────────────────────────────────────────
  const runPipeline = async (blob: Blob, filename: string) => {
    if (!patientName.trim()) { setError("Please enter patient name first."); return; }
    setIsProcessing(true); setResult(null); setError(null);

    const form = new FormData();
    form.append("file", blob, filename);
    form.append("patient_name", patientName);
    form.append("patient_id", patientId);
    form.append("doctor_name", doctorName);
    form.append("clinic_name", clinicName);
    form.append("email", email);
    form.append("phone_number", phone);
    form.append("preferred_language", language);

    try {
      const res = await fetch(`${BACKEND_URL}/full-pipeline`, { method: "POST", body: form });
      const data: PipelineResult = await res.json();
      if (!res.ok) throw new Error((data as any).detail || `Error ${res.status}`);
      setResult(data);
      setExpanded("transcription");
    } catch (e: any) {
      setError(e.message || "Pipeline failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggle = (key: string) => setExpanded(p => p === key ? null : key);

  const stepDone = (key: string) => result?.steps_completed?.includes(key);

  const formatValue = (v: any): string => {
    if (typeof v === "string") return v;
    return JSON.stringify(v, null, 2);
  };

  const getSectionValue = (key: string): string => {
    if (!result) return "";
    const val = (result as any)[key];
    return formatValue(val ?? "—");
  };

  // ── Risk colour ───────────────────────────────────────────────────────
  const isRed = result?.risk_status === "RED" || (result?.red_flags as any)?.alert_count > 0;
  const riskCls = isRed
    ? "text-red-500 bg-red-500/10 border-red-500/30"
    : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl"><FileText className="w-8 h-8 text-primary" /></div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Consultation & Full Pipeline</h1>
              <p className="text-zinc-500 text-sm mt-0.5">Record → SOAP → Red Flags → ICD → Email — all automated</p>
            </div>
          </div>

          {/* Patient Info Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 mb-4">
            <h2 className="font-semibold text-zinc-800 dark:text-white mb-4">Patient Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Patient Name *", val: patientName, set: setPatientName, placeholder: "John Doe" },
                { label: "Patient ID", val: patientId, set: setPatientId, placeholder: "P001" },
                { label: "Email (for report)", val: email, set: setEmail, placeholder: "patient@email.com", type: "email" },
                { label: "Phone", val: phone, set: setPhone, placeholder: "+91xxxxxxxxxx" },
                { label: "Doctor Name", val: doctorName, set: setDoctorName, placeholder: "Dr. Smith" },
                { label: "Clinic Name", val: clinicName, set: setClinicName, placeholder: "Smart EMR Clinic" },
              ].map(({ label, val, set, placeholder, type }) => (
                <div key={label}>
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">{label}</label>
                  <input
                    type={type || "text"}
                    value={val}
                    onChange={e => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1">Report Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {["English", "Hindi", "Marathi", "Tamil"].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Recording Controls */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              {!isRecording ? (
                <Button size="lg" onClick={startRecording} disabled={isProcessing}
                  className="gap-2 bg-primary hover:bg-primary/90 text-white px-8 h-14 rounded-2xl text-base font-semibold">
                  <Mic className="w-5 h-5" /> Start Recording
                </Button>
              ) : (
                <Button size="lg" onClick={stopAndProcess}
                  className="gap-2 bg-red-600 hover:bg-red-700 text-white px-8 h-14 rounded-2xl text-base font-semibold animate-pulse">
                  <MicOff className="w-5 h-5" /> Stop & Run Full Pipeline
                </Button>
              )}
              <span className="text-zinc-400 text-sm font-medium">OR</span>
              <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isRecording}
                className="gap-2 border-zinc-300 dark:border-zinc-700 h-14 rounded-2xl px-8 text-base">
                <Upload className="w-5 h-5" /> Upload Audio File
              </Button>
              <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
            </div>

            {isRecording && (
              <div className="mt-5 flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-semibold text-sm">Recording… speak now</span>
              </div>
            )}

            {isProcessing && (
              <div className="mt-5 flex items-center justify-center gap-3 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Running full pipeline — SOAP → Red Flags → ICD → Email…</span>
              </div>
            )}

            {error && (
              <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
          </div>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-4">

                {/* Pipeline Progress */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="font-semibold text-zinc-700 dark:text-zinc-200 text-sm mb-3">Pipeline Progress</h3>
                  <div className="flex flex-wrap gap-2">
                    {["transcription", "soap", "red_flags", "icd_mapping", "summary", "pdf_qr", "email"].map(s => (
                      <span key={s} className={`px-3 py-1 rounded-full text-xs font-semibold ${stepDone(s) ? "bg-emerald-500/15 text-emerald-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                        {stepDone(s) ? "✅" : "⏸"} {s.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {result.errors.map((e, i) => <p key={i} className="text-xs text-amber-600">⚠ {e}</p>)}
                    </div>
                  )}
                </div>

                {/* Risk Banner */}
                <div className={`flex items-center gap-3 p-4 rounded-2xl border font-medium text-sm ${riskCls}`}>
                  {isRed ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                  {isRed
                    ? `🔴 ${(result.red_flags as any)?.alert_count || 1} red flag(s) detected — immediate review required`
                    : "🟢 No red flags — patient appears stable"}
                </div>

                {/* Email Status */}
                {result.email_status && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium ${result.email_status === "sent" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" : "bg-amber-500/10 border-amber-500/30 text-amber-600"}`}>
                    <Send className="w-4 h-4 shrink-0" />
                    {result.email_status === "sent"
                      ? `✅ Report emailed to ${email}`
                      : `📧 Email: ${result.email_status}`}
                  </div>
                )}

                {/* Collapsible Sections */}
                {SECTIONS.map(({ key, label }) => {
                  const val = getSectionValue(key);
                  if (!val || val === "—" || val === "null") return null;
                  return (
                    <div key={key} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                      <button onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <span className="font-semibold text-zinc-900 dark:text-white text-sm">{label}</span>
                        {expanded === key ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                      </button>
                      <AnimatePresence>
                        {expanded === key && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <pre className="px-6 pb-6 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono bg-zinc-50 dark:bg-zinc-800/40">
                              {val}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* QR Code */}
                {result.qr_code_base64 && (
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center gap-3 shadow-sm">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-200 text-sm">📱 Scan to Download Report</p>
                    <img src={result.qr_code_base64} alt="Report QR Code" className="w-36 h-36 rounded-xl" />
                    {result.report_link && (
                      <a href={result.report_link} target="_blank" rel="noopener noreferrer"
                        className="text-primary text-xs underline">Download PDF Report</a>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
