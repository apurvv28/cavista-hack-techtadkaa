"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  FileText,
  Pill,
  Activity,
  Video,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import AbhaStatusCard from "@/components/abha/AbhaStatusCard";
import AbhaSyncModal from "@/components/abha/AbhaSyncModal";

export default function PatientDashboard() {
  const { user } = useUser();
  const [showAbhaModal, setShowAbhaModal] = useState(false);

  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const appointments = useQuery(
    api.appointments.getUpcomingAppointments,
    convexUser?._id ? { userId: convexUser._id } : "skip",
  );

  // Fetch ABHA status to decide whether to show onboarding modal
  const abhaStatus = useQuery(
    api.abha.getAbhaStatus,
    convexUser?._id ? { userId: convexUser._id } : "skip",
  );

  // Auto-show ABHA modal once when user loads dashboard and has no ABHA linked
  useEffect(() => {
    if (convexUser && abhaStatus === null) {
      // Small delay so the dashboard renders first
      const timer = setTimeout(() => setShowAbhaModal(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [convexUser, abhaStatus]);

  const activeOnlineAppt = appointments?.find(
    (a: any) => a.type === "online" && a.status === "scheduled",
  );

  return (
    <div className="space-y-8">
      {activeOnlineAppt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between gap-4"
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
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            My Health Record
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
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
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-linear-to-br from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Next Appointment
            </CardTitle>
            <Calendar className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent className="mt-4">
            {activeOnlineAppt ? (
              <>
                <div className="text-2xl font-bold">
                  {new Date(activeOnlineAppt.scheduledAt).toLocaleString()}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Scheduled Appointment
                </p>
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-200 bg-amber-50"
                  >
                    {activeOnlineAppt.type === "online"
                      ? "Online"
                      : "In-Person"}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    Status: {activeOnlineAppt.status}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-500">
                No upcoming appointments
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Prescriptions */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Prescriptions
            </CardTitle>
            <Pill className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="text-sm text-zinc-500">
              Prescription data will be displayed once consultations are
              completed.
            </div>
          </CardContent>
        </Card>

        {/* ABHA Sync Status — Live dynamic card */}
        {convexUser?._id && (
          <AbhaStatusCard userId={convexUser._id} />
        )}

      </div>

      {/* ABHA Onboarding Modal — auto-shows if not linked */}
      {showAbhaModal && convexUser?._id && (
        <AbhaSyncModal
          userId={convexUser._id}
          onClose={() => setShowAbhaModal(false)}
          onLinked={() => setShowAbhaModal(false)}
        />
      )}

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm mt-8">
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
