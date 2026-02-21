import { FeatureCard } from "./FeatureCard";
import { 
  FileText, 
  AlertTriangle, 
  BookOpen, 
  MessageSquare, 
  ShieldCheck, 
  Activity, 
  FileSearch, 
  History, 
  Mic2, 
  HeartPulse 
} from "lucide-react";

const features = [
  // TIER 1: CORE EMR VALUE
  {
    title: "Real-Time SOAP Note Generation",
    description: "AI extracts Chief Complaint, History, Vitals, Assessment, and Plan automatically as the doctor speaks or types.",
    howItWorks: "Whisper API (STT) + NLP models display a structured note live during consultation.",
    icon: FileText,
    tier: "Tier 1: Core",
  },
  {
    title: "Clinical Red-Flag Alert Engine",
    description: "Scans transcripts for danger keywords (e.g., 'chest pain + radiating' = ACS Alert) and suggests immediate action.",
    howItWorks: "Rule-based keyword engine and regex cluster matching triggers an alert banner in the UI.",
    icon: AlertTriangle,
    tier: "Tier 1: Core",
  },
  {
    title: "Explainable ICD-10 Code Mapping",
    description: "Matches extracted text to ICD-10 codes, displaying the code, diagnosis name, and highlighting the trigger sentence with a confidence score.",
    howItWorks: "LLM extracts diagnosis, matches via local ICD-10 database, and highlights evidence.",
    icon: BookOpen,
    tier: "Tier 1: Core",
  },
  {
    title: "Patient Plain-Language Summary",
    description: "Generates a simplified, WhatsApp-ready summary (English/Hindi) of what's wrong, what to take, and when to return. Includes a QR code.",
    howItWorks: "Second LLM call simplifies the note into a React summary card with a quick-scan QR.",
    icon: MessageSquare,
    tier: "Tier 1: Core",
  },
  // TIER 2: DIFFERENTIATORS
  {
    title: "AI Hallucination Guard",
    description: "Cross-checks facts: verifies if every claim in the generated note is supported by the original transcript and flags uncertain extractions.",
    howItWorks: "Secondary verification LLM call returns JSON validity checks; requires doctor confirmation.",
    icon: ShieldCheck,
    tier: "Tier 2: Advanced",
    badge: "Safety Verification",
  },
  {
    title: "Smart Triage Assistant",
    description: "Pre-consultation chatbot that assigns a triage level (Emergency/Urgent/Routine) and suggests initial tests based on patient input.",
    howItWorks: "LLM triage prompt powers a self-serve chat interface with color-coded urgency.",
    icon: Activity,
    tier: "Tier 2: Advanced",
  },
  {
    title: "Multi-Modal Input (OCR + PDF)",
    description: "Doctors can upload lab reports or PDFs. AI reads, extracts values, highlights abnormal results, and merges them into the note.",
    howItWorks: "Vision API or OCR library parses documents directly into the SOAP structure.",
    icon: FileSearch,
    tier: "Tier 2: Advanced",
  },
  {
    title: "Consent & Audit Trail Logger",
    description: "Timestamps and records every action: recording start/stop, note generation, edits, and exports for complete compliance.",
    howItWorks: "Database logging displayed as a UI timeline, exportable as an ABDM/DPDP compliant PDF.",
    icon: History,
    tier: "Tier 2: Advanced",
  },
  // BONUS TIER: INDIA-SPECIFIC
  {
    title: "Hinglish / Multilingual Medical Voice",
    description: "Native code-switching support. Doctors can mix Hindi and English mid-sentence, and the system understands perfectly to generate English structured notes.",
    howItWorks: "Whisper API handles the mixed input seamlessly based on specialized LLM prompting.",
    icon: Mic2,
    tier: "Bonus: India USP",
    badge: "Killer Feature",
  },
  {
    title: "ABDM / ABHA Integration",
    description: "Links a patient's ABHA ID to their EMR record, pulling existing health records, past diagnoses, and vaccination history from the national stack.",
    howItWorks: "Integration with the ABDM Sandbox API for fetching cross-hospital patient history.",
    icon: HeartPulse,
    tier: "Bonus: India USP",
    badge: "Govt Ready",
  }
];

export const FeaturesList = () => {
  return (
    <section className="bg-zinc-50 dark:bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-base font-semibold leading-7 text-primary dark:text-primary/80">
            Comprehensive Toolkit
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl text-left lg:text-center">
            Everything you need to run a modern, AI-powered clinic
          </p>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400 text-left lg:text-center">
            From seamless voice-to-text documentation to national health stack integrations, our platform is built for the future of Indian healthcare.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="grid max-w-xl grid-cols-1 gap-x-6 gap-y-10 lg:max-w-none lg:grid-cols-5">
            {features.map((feature, index) => (
              <FeatureCard 
                key={feature.title}
                {...feature}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
