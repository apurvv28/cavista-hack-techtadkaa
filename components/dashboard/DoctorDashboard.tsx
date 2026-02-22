"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Users,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Video,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function DoctorDashboard() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const appointments = useQuery(
    api.appointments.getUpcomingAppointments,
    convexUser?._id ? { userId: convexUser._id } : "skip",
  );

  const activeOnlineAppt = appointments?.find(
    (a: any) => a.type === "online" && a.status === "scheduled",
  );
  return (
    <div className="space-y-8">
      {activeOnlineAppt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary border border-primary/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
              <Video className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-bold text-xl text-white">
                Online Consultation Ready
              </p>
              <p className="text-white/70 text-sm">
                Your next patient is waiting in the virtual room.
              </p>
            </div>
          </div>
          <Link
            href={`/consultation/${activeOnlineAppt._id}`}
            className="relative z-10 w-full md:w-auto"
          >
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-zinc-100 w-full md:w-auto px-8 font-bold h-14 rounded-2xl shadow-xl hover:shadow-2xl transition-all"
            >
              Join Video Room
            </Button>
          </Link>
        </motion.div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Doctor Overview
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Here's what's happening in your clinic today.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white">
          Start New Consultation
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients Seen</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              +4 from yesterday
            </p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reviews
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Notes awaiting sign-off
            </p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Red Flags</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Hallucination Guard
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.8%</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Average accuracy rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Queue & Alerts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader>
            <CardTitle>Recent SOAP Notes (Pending Sign-off)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {appointments && appointments.length > 0 ? (
              appointments.slice(0, 3).map((appt: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {appt.patientId || "Patient"}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {appt.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-500">
                      {new Date(appt.scheduledAt).toLocaleDateString()}
                    </span>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
                      Review
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">
                No SOAP notes available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader>
            <CardTitle>Priority Triage Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {appointments &&
              appointments.filter((a: any) => a.status !== "completed").length >
              0 ? (
              appointments
                .filter((a: any) => a.status !== "completed")
                .slice(0, 2)
                .map((alert: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0"
                  >
                    <div className="p-2 rounded-full bg-primary/20 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium leading-none flex items-center gap-2">
                        {alert.patientId || "Patient"}
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {alert.type === "online" ? "ONLINE" : "OFFLINE"}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(alert.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-sm text-zinc-500">
                No pending appointments
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
