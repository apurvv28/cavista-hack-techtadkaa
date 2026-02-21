"use client";

import { motion } from "framer-motion";
import { Calendar, FileText, Pill, Activity, ShieldCheck, HeartPulse, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

export default function PatientDashboard() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getUser, user?.id ? { clerkId: user.id } : "skip");
  
  const appointments = useQuery(api.appointments.getUpcomingAppointments, 
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  const activeOnlineAppt = appointments?.find((a: any) => a.type === "online" && a.status === "scheduled");

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
              <p className="font-bold text-sm text-zinc-900 dark:text-white">Active Online Consultation</p>
              <p className="text-xs text-zinc-500">Your doctor is ready for the video call.</p>
            </div>
          </div>
          <Link href={`/consultation/${activeOnlineAppt._id}`}>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg">
              Join Video Call
            </Button>
          </Link>
        </motion.div>
      )}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">My Health Record</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Welcome back. Your health is fully synced with ABDM.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Link href="/dashboard/schedule" className="w-full md:w-auto">
            <Button variant="outline" className="w-full md:w-auto flex items-center gap-2 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
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
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Appointment</CardTitle>
            <Calendar className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent className="mt-4">
            <div className="text-2xl font-bold">Today, 2:30 PM</div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Dr. Sharma • General Physician</p>
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">In Appt Queue: #3</Badge>
              <span className="text-xs text-zinc-500">Wait time: ~15 mins</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Prescriptions */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Metformin 500mg</p>
                <p className="text-xs text-zinc-500">Take twice daily after meals</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Refill Ready</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Amlodipine 5mg</p>
                <p className="text-xs text-zinc-500">Take once daily</p>
              </div>
              <Badge variant="secondary" className="bg-zinc-100 text-zinc-600">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">ABDM ABHA Status</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="mt-4 relative z-10 flex flex-col justify-between h-[100px]">
            <div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Synced and Authentic
              </p>
              <p className="text-xs text-zinc-500 mt-2">Your health records are securely linked across all national health providers.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Recent Visit Summaries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[
              { date: "Oct 12, 2025", doctor: "Dr. Sharma", condition: "Routine Checkup", instructions: "All vitals normal. Continue light exercise and prescribed Metformin." },
              { date: "Sep 04, 2025", doctor: "Dr. Patel (Cardiology)", condition: "BP Monitor Follow-up", instructions: "Blood pressure stabilizing. Amlodipine dosage kept at 5mg." }
            ].map((visit, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-4 justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                <div className="md:w-1/3 space-y-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">{visit.date}</p>
                  <p className="text-sm font-medium">{visit.doctor}</p>
                  <p className="text-xs text-primary">{visit.condition}</p>
                </div>
                <div className="md:w-2/3 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Plain Language Summary</span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{visit.instructions}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
