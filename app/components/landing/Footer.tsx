import { ShieldCheck, FileText, HeartPulse } from "lucide-react";
import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-zinc-950 text-zinc-300 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 border-b border-zinc-800 pb-12">
          {/* Brand Col */}
          <div className="md:col-span-1">
            <span className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <HeartPulse className="h-6 w-6 text-primary" />
              Smart EMR
            </span>
            <p className="text-sm text-zinc-400">
              The AI-powered Smart EMR & Diagnostic Assistant built for the modern Indian healthcare ecosystem.
            </p>
          </div>

          {/* Core Features Col */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Features</h3>
            <ul className="space-y-3 text-sm">
              <li><span className="hover:text-white transition-colors">Real-time SOAP Gen</span></li>
              <li><span className="hover:text-white transition-colors">Red-Flag Alerts</span></li>
              <li><span className="hover:text-white transition-colors">Hinglish Voice</span></li>
              <li><span className="hover:text-white transition-colors">Smart Triage</span></li>
            </ul>
          </div>

          {/* Resources Col */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="#" className="hover:text-white transition-colors">Knowledge Base</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">API Documentation</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Webinars</Link></li>
            </ul>
          </div>

          {/* Compliance Col */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Compliance</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-zinc-500" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-zinc-500" />
                <span>ABDM Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                <span>DPDP Act Aligned</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Smart EMR Systems. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
