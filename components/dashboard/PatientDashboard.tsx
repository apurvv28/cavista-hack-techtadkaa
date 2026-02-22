"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  FileText,
  Pill,
  Activity,
  ShieldCheck,
  Download,
  Video,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

export default function PatientDashboard() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const appointments = useQuery(
    api.appointments.getUpcomingAppointments,
    convexUser?._id ? { userId: convexUser._id } : "skip",
  );

  const queueStatus = useQuery(
    api.appointments.getPatientQueueStatus,
    convexUser?._id ? { patientId: convexUser._id } : "skip",
  );

  const prescriptions = useQuery(
    api.users.getPrescriptionsByPatientId,
    convexUser?._id ? { patientId: String(convexUser._id) } : "skip",
  );

  const activeOnlineAppt = appointments?.find(
    (a: any) => a.type === "online" && a.status === "scheduled",
  );

  const nextScheduledAppt = appointments
    ?.filter((a: any) => a.status === "scheduled")
    .sort(
      (a: any, b: any) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    )[0];

  return (
    <div className="space-y-8">
      {activeOnlineAppt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 border border-zinc-200 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm text-zinc-900 dark:text-white">
                Active Online Consultation
              </p>
              <p className="text-xs text-zinc-500">
                Your doctor is ready for the video call.
              </p>
            </div>
          </div>
          <Link href={`/consultation/${activeOnlineAppt._id}`}>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg"
            >
              Join Video Call
            </Button>
          </Link>
        </motion.div>
      )}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold  tracking-tight text-zinc-900 dark:text-white ">
            Health Record
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Welcome back. Your health is fully synced with ABDM.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Link href="/dashboard/schedule" className="w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto flex items-center gap-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Schedule Appointment
            </Button>
          </Link>
          <Link href="/triage" className="w-full md:w-auto">
            <Button className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 w-full md:w-auto">
              <Activity className="w-4 h-4" />
              Start Triage Assessment
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Next Appointment */}
        <Card className="border-zinc-200/80 shadow-sm bg-white/90 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Next Appointment
            </CardTitle>
            <Calendar className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent className="mt-4 min-h-44 flex flex-col justify-between">
            {nextScheduledAppt ? (
              <>
                <div className="text-xl font-semibold text-zinc-800">
                  {new Date(nextScheduledAppt.scheduledAt).toLocaleString()}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Scheduled Appointment
                </p>
                <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-200 bg-amber-50"
                  >
                    {nextScheduledAppt.type === "online"
                      ? "Online"
                      : "In-Person"}
                  </Badge>
                  <div className="text-sm text-zinc-500">
                    Status: {nextScheduledAppt.status}
                  </div>
                </div>
                {queueStatus && (
                  <div className="mt-3 text-xs text-zinc-600">
                    Queue #{queueStatus.queueIndex} · ETA{" "}
                    {queueStatus.estimatedWaitMinutes} min · Risk{" "}
                    {queueStatus.patientRiskScore}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-zinc-500">
                No upcoming appointments
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Prescriptions */}
        <Card className="border-zinc-200/80 shadow-sm bg-white/90 rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Prescriptions
            </CardTitle>
            <Pill className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            {prescriptions && prescriptions.length > 0 ? (
              prescriptions.slice(0, 3).map((prescription: any) => (
                <div
                  key={prescription._id}
                  className="flex items-center justify-between gap-3 border border-zinc-200 rounded-xl px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {prescription.doctorName || "Doctor"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Date:{" "}
                      {prescription.prescriptionDate ||
                        new Date(prescription.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={prescription.blobUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">
                No active prescriptions available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card className="border-zinc-200/80 shadow-sm bg-white/90 relative overflow-hidden rounded-3xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">
              ABDM ABHA Status
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="mt-4 relative z-10 flex flex-col justify-between h-25">
            <div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Synced and Authentic
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Your health records are securely linked across all national
                health providers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200/80 shadow-sm bg-white/90 mt-8 rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Recent Visit Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {appointments &&
            appointments.filter((a: any) => a.status === "completed").length >
              0 ? (
              appointments
                .filter((a: any) => a.status === "completed")
                .slice(0, 2)
                .map((visit: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-col md:flex-row gap-4 justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0"
                  >
                    <div className="md:w-1/3 space-y-1">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {new Date(visit.scheduledAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-medium">Consultation</p>
                      <p className="text-xs text-primary">
                        {visit.type === "online" ? "Video Call" : "In-Person"}
                      </p>
                    </div>
                    <div className="md:w-2/3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                        Consultation Summary
                      </span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        Consultation completed on{" "}
                        {new Date(visit.scheduledAt).toLocaleDateString()}. View
                        detailed SOAP notes for clinical summary.
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-sm text-zinc-500">
                No completed consultations yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
