"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Link2,
  Clock,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import AbhaSyncModal from "./AbhaSyncModal";

interface AbhaStatusCardProps {
  userId: Id<"users">;
}

export default function AbhaStatusCard({ userId }: AbhaStatusCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  const abhaStatus = useQuery(api.abha.getAbhaStatus, { userId });
  const addSyncedReport = useMutation(api.abha.addSyncedReport);

  const isLoading = abhaStatus === undefined;
  const isLinked = abhaStatus !== null && abhaStatus !== undefined;

  const handleManualSync = async () => {
    if (!abhaStatus) return;
    setSyncing(true);
    setLastSyncResult(null);
    try {
      const res = await fetch("/api/abha/sync-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abha_id: abhaStatus.abhaId,
          report_id: `manual-sync-${Date.now()}`,
          appointment_date: new Date().toISOString(),
          soap_summary: "Manual sync triggered from patient dashboard",
          report_type: "Dashboard Sync",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastSyncResult(`✓ Synced (TXN: ${data.transaction_id})`);
      } else {
        setLastSyncResult("✗ Sync failed");
      }
    } catch {
      setLastSyncResult("✗ Could not connect to sandbox");
    } finally {
      setSyncing(false);
    }
  };

  const maskedAbhaId = (id: string) => {
    if (!id) return "";
    const parts = id.split("-");
    // Show first and last segment, mask middle two
    return `${parts[0]}-XXXX-XXXX-${parts[3]}`;
  };

  if (isLoading) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">ABDM ABHA Status</CardTitle>
          <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
        </CardHeader>
        <CardContent className="mt-4 relative z-10">
          <div className="space-y-2">
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-16 -mt-16 ${isLinked ? "bg-emerald-500/10" : "bg-amber-500/10"}`} />

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">ABDM ABHA Status</CardTitle>
          {isLinked
            ? <ShieldCheck className="h-4 w-4 text-emerald-500" />
            : <ShieldAlert className="h-4 w-4 text-amber-500" />
          }
        </CardHeader>

        <CardContent className="mt-4 relative z-10 space-y-4">
          {isLinked ? (
            <>
              <div>
                <p className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Linked &amp; {abhaStatus.autoSync ? "Auto-Syncing" : "Active"}
                </p>
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  {maskedAbhaId(abhaStatus.abhaId)}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {abhaStatus.abhaName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <FileText className="w-3 h-3 text-zinc-400" />
                    <span className="text-xs text-zinc-500">Synced</span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">
                    {abhaStatus.syncedReportIds.length}
                  </p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span className="text-xs text-zinc-500">Last Sync</span>
                  </div>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {abhaStatus.lastSyncAt
                      ? new Date(abhaStatus.lastSyncAt).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>

              {abhaStatus.autoSync && (
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 text-xs w-full justify-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Auto-sync Enabled
                </Badge>
              )}

              {lastSyncResult && (
                <p className={`text-xs text-center font-mono ${lastSyncResult.startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>
                  {lastSyncResult}
                </p>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 gap-2 text-xs"
                onClick={handleManualSync}
                disabled={syncing}
              >
                {syncing
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <RefreshCw className="w-3 h-3" />
                }
                {syncing ? "Syncing…" : "Sync Now"}
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  Not Linked
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  Link your ABHA ID to sync health records across all ABDM-connected providers.
                </p>
              </div>

              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-2 text-xs shadow-md shadow-emerald-500/20"
                onClick={() => setShowModal(true)}
              >
                <Link2 className="w-3 h-3" />
                Link ABHA ID
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <AbhaSyncModal
          userId={userId}
          onClose={() => setShowModal(false)}
          onLinked={() => setShowModal(false)}
        />
      )}
    </>
  );
}
