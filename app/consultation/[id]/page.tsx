"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  FileText,
  Download,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useVideoCall } from "@/hooks/useVideoCall";
import { useTranscription } from "@/hooks/useTranscription";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { PrescriptionForm } from "@/components/documents/PrescriptionForm";

export default function ConsultationRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const appointmentId = id as Id<"appointments">;

  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const role = convexUser?.role === "doctor" ? "Doctor" : "Patient";
  const postCallRoute = "/dashboard";

  const {
    localStream,
    remoteStream,
    connectionStatus,
    startCall,
    joinCall,
    endCall,
    sendMessage,
    setAudioEnabled,
    setVideoEnabled,
  } = useVideoCall(appointmentId, convexUser?._id!, (msg) => {
    if (msg.type === "transcript") {
      setTranscript((prev) => [...prev, msg.entry]);
    }
  }, async () => {
    // Remote party ended the call — mirror the end on this side too
    console.log("[Consultation] Remote party ended call, closing this side.");
    stopTranscription();
    await endCall();
    router.push("/dashboard");
  });

  const appointment = useQuery(api.appointments.getAppointment, {
    appointmentId,
  });
  const patient = useQuery(
    api.users.getUserById,
    appointment?.patientId ? { userId: appointment.patientId } : "skip",
  );
  const completeAppointmentMutation = useMutation(
    api.appointments.completeAppointment,
  );

  const {
    transcript,
    isRecording,
    startTranscription,
    stopTranscription,
    exportTranscript,
    setTranscript,
  } = useTranscription(role, (entry) => {
    sendMessage({ type: "transcript", entry });
  });

  const {
    isAudioRecording,
    startAudioRecording,
    stopAudioRecording,
    addRemoteStreamToRecording,
  } = useAudioRecorder();

  const saveTranscriptMutation = useMutation(api.consultations.saveTranscript);
  const [isSaving, setIsSaving] = useState(false);
  const [showEndCallPrompt, setShowEndCallPrompt] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: "success" | "error";
  }>({
    open: false,
    message: "",
    type: "success",
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Dedicated effect to update video streams only when they change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    if (audioTrack) setIsMicEnabled(audioTrack.enabled);
    if (videoTrack) setIsCameraEnabled(videoTrack.enabled);
  }, [localStream]);

  // Sync state: Start/Join call depending on role or availability
  useEffect(() => {
    if (convexUser && connectionStatus === "disconnected") {
      if (convexUser.role === "doctor") {
        startCall();
      } else {
        joinCall();
      }
    }
  }, [convexUser, connectionStatus, startCall, joinCall]);

  // Start audio recording once connection is established
  useEffect(() => {
    if (connectionStatus === "connected" && localStream && !isAudioRecording) {
      startAudioRecording(localStream);
    }
  }, [connectionStatus, localStream, isAudioRecording, startAudioRecording]);

  // Mix in remote stream when it appears
  useEffect(() => {
    if (isAudioRecording && remoteStream) {
      addRemoteStreamToRecording(remoteStream);
    }
  }, [isAudioRecording, remoteStream, addRemoteStreamToRecording]);

  // Autostart transcription when connected
  useEffect(() => {
    if (connectionStatus === "connected" && !isRecording) {
      startTranscription();
    }
  }, [connectionStatus, isRecording, startTranscription]);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Listen for external termination (when the other party ends the call)
  useEffect(() => {
    if (appointment?.status === "completed") {
      // Small delay to allow the last state to settle
      const timeout = setTimeout(() => {
        stopTranscription();
        endCall();
        router.push(postCallRoute);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [appointment?.status, endCall, stopTranscription, router, postCallRoute]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ open: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 2500);
  };

  const finalizeAndLeave = async () => {
    stopTranscription();
    await endCall();
    await completeAppointmentMutation({ appointmentId });
  };

  const safeCompleteAndLeave = async () => {
    try {
      await finalizeAndLeave();
      showToast("Consultation completed.", "success");
    } catch (error) {
      console.error("[Call] Failed to finalize call cleanly:", error);
      showToast("Call ended, but status update failed.", "error");
    }
  };

  const toggleMic = () => {
    const next = !isMicEnabled;
    const result = setAudioEnabled(next);
    if (result !== null) {
      setIsMicEnabled(result);
    }
  };

  const toggleCamera = async () => {
    const next = !isCameraEnabled;
    const result = await setVideoEnabled(next);
    if (result !== null) {
      setIsCameraEnabled(result);
    }
  };

  const handleEndWithoutSaving = async () => {
    setShowEndCallPrompt(false);
    setIsSaving(true);
    try {
      await safeCompleteAndLeave();
      router.push(postCallRoute);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    setShowEndCallPrompt(false);
    setIsSaving(true);

    // Stop recorder and end call immediately from user's perspective,
    // while uploads continue in background.
    const audioBlobPromise = stopAudioRecording();
    await safeCompleteAndLeave();

    const textContent = transcript
      .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
      .join("\n");

    const effectiveName = patient?.fullName || `Appointment_${appointmentId}`;

    try {
      const audioBlob = await audioBlobPromise;

      // 2. Save transcript to Convex Cloud
      if (textContent) {
        try {
          await saveTranscriptMutation({ appointmentId, content: textContent });
          console.log("[Save] Transcript saved to Convex.");
        } catch (e) {
          console.error("[Save] Failed to save transcript to Convex:", e);
        }
      }

      // 3. Save transcript to local filesystem
      if (textContent) {
        try {
          console.log("[Save] Sending transcript to local API...");
          await fetch("/api/save-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientName: effectiveName,
              content: textContent,
            }),
          });
        } catch (e) {
          console.error("[Save] Failed to save transcript locally:", e);
        }
      }

      // 4. Save audio to Vercel Blob
      if (audioBlob && audioBlob.size > 0) {
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "audio.webm");
          formData.append("patientName", effectiveName);

          console.log("[Save] Fetching /api/save-audio...");
          const res = await fetch("/api/save-audio", {
            method: "POST",
            body: formData,
          });

          const json = await res.json();
          if (res.ok) {
            console.log("[Save] Audio stored in Vercel Blob:", json.url);
            showToast("Audio stored successfully.", "success");
          } else {
            console.error("[Save] Audio storage failed:", json);
            showToast("Audio upload failed.", "error");
          }
        } catch (e: any) {
          console.error("[Save] Failed to save audio:", e);
          showToast("Audio upload failed.", "error");
        }
      } else {
        console.warn("[Save] Skipping audio save — blob is empty or null.");
        showToast("No audio captured to upload.", "error");
      }

      if (textContent) exportTranscript();
    } catch (e: any) {
      console.error("[Save] Unexpected error during save:", e);
      showToast("Failed to save consultation data.", "error");
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        router.push(postCallRoute);
      }, 900);
    }
  };

  if (!convexUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-zinc-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-200/80 flex items-center justify-between bg-white/80 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Video className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Secure Consultation</h1>
            <p className="text-xs text-zinc-500 capitalize">
              Role: {role} • Status: {connectionStatus}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 gap-2"
            onClick={() =>
              isRecording ? stopTranscription() : startTranscription()
            }
          >
            {isRecording ? (
              <Mic className="w-4 h-4 text-red-500 animate-pulse" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
            {isRecording ? "Recording Live" : "Start Voice Recording"}
          </Button>
          <Button
            variant="destructive"
            className="gap-2 bg-red-600 hover:bg-red-700"
            onClick={() => setShowEndCallPrompt(true)}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PhoneOff className="w-4 h-4" />
            )}
            End & Save Record
          </Button>
        </div>
      </header>

      {/* Main Grid */}
      <main
        className={`flex-1 p-4 min-h-0 gap-4 ${convexUser.role === "doctor" ? "grid grid-cols-1 xl:grid-cols-2" : "flex flex-col xl:flex-row"}`}
      >
        <div
          className={`min-h-0 flex ${convexUser.role === "doctor" ? "flex-col gap-4" : "xl:basis-3/5"}`}
        >
          <div className="relative flex-3 min-h-90 bg-black/90 rounded-3xl overflow-hidden border border-zinc-200 shadow-xl">
            <div className="absolute inset-0 flex items-center justify-center">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-zinc-500">
                  <Users className="w-16 h-16 opacity-20" />
                  <p className="text-sm font-medium">
                    Waiting for other party to connect...
                  </p>
                </div>
              )}
            </div>

            <div className="absolute top-6 right-6 w-48 h-32 md:w-64 md:h-44 bg-black/70 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover grayscale-[0.2]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-zinc-600" />
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/75 backdrop-blur-xl rounded-full border border-zinc-200 shadow-xl z-20">
              <Button
                size="icon"
                variant="ghost"
                className={`rounded-full w-12 h-12 ${isMicEnabled ? "text-zinc-700 hover:bg-zinc-100" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                onClick={toggleMic}
              >
                {isMicEnabled ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`rounded-full w-12 h-12 ${isCameraEnabled ? "text-zinc-700 hover:bg-zinc-100" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                onClick={toggleCamera}
              >
                {isCameraEnabled ? (
                  <Video className="w-5 h-5" />
                ) : (
                  <VideoOff className="w-5 h-5" />
                )}
              </Button>
              <div className="w-px h-6 bg-zinc-300 mx-2" />
              <Button
                size="icon"
                variant="destructive"
                className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-700"
                onClick={() => setShowEndCallPrompt(true)}
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {convexUser.role === "doctor" ? (
            <Card className="flex-1 min-h-55 bg-white border-zinc-200 overflow-hidden flex flex-col rounded-[2rem] ring-1 ring-zinc-200 shadow-sm">
              <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xs tracking-tight text-zinc-900">
                    Live Transcript
                  </h3>
                </div>
                {isRecording && (
                  <span className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Recording
                  </span>
                )}
              </div>
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {transcript.map((entry, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-tighter ${entry.speaker === "Doctor" ? "text-primary" : "text-emerald-500"}`}
                        >
                          {entry.speaker}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-medium">
                          {entry.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                        {entry.text}
                      </p>
                    </motion.div>
                  ))}
                  <div ref={transcriptEndRef} />
                </AnimatePresence>

                {transcript.length === 0 && (
                  <div className="h-full flex items-center justify-center text-center p-4 opacity-40">
                    <p className="text-xs text-zinc-500">
                      No conversation recorded yet.
                    </p>
                  </div>
                )}
              </CardContent>
              <div className="p-3 bg-white border-t border-zinc-200">
                <Button
                  variant="outline"
                  className="w-full text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 text-xs gap-2"
                  onClick={exportTranscript}
                  disabled={transcript.length === 0}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Transcript (.txt)
                </Button>
              </div>
            </Card>
          ) : null}
        </div>

        {convexUser.role !== "doctor" ? (
          <div className="min-h-0 xl:basis-2/5">
            <Card className="h-full bg-white border-zinc-200 overflow-hidden flex flex-col rounded-[2rem] ring-1 ring-zinc-200 shadow-sm">
              <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xs tracking-tight text-zinc-900">
                    Live Transcript
                  </h3>
                </div>
                {isRecording && (
                  <span className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    Recording
                  </span>
                )}
              </div>
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {transcript.map((entry, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-tighter ${entry.speaker === "Doctor" ? "text-primary" : "text-emerald-500"}`}
                        >
                          {entry.speaker}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-medium">
                          {entry.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                        {entry.text}
                      </p>
                    </motion.div>
                  ))}
                  <div ref={transcriptEndRef} />
                </AnimatePresence>

                {transcript.length === 0 && (
                  <div className="h-full flex items-center justify-center text-center p-4 opacity-40">
                    <p className="text-xs text-zinc-500">
                      No conversation recorded yet.
                    </p>
                  </div>
                )}
              </CardContent>
              <div className="p-3 bg-white border-t border-zinc-200">
                <Button
                  variant="outline"
                  className="w-full text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 text-xs gap-2"
                  onClick={exportTranscript}
                  disabled={transcript.length === 0}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Transcript (.txt)
                </Button>
              </div>
            </Card>
          </div>
        ) : null}

        {convexUser.role === "doctor" ? (
          <div className="min-h-0 overflow-y-auto custom-scrollbar rounded-3xl bg-white p-3">
            <PrescriptionForm
              embedded
              patientContext={{
                patientId: appointment?.patientId
                  ? String(appointment.patientId)
                  : "",
                patientName: patient?.fullName || "",
              }}
            />
          </div>
        ) : null}
      </main>

      {showEndCallPrompt && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900">
              Save consultation before ending?
            </h3>
            <p className="text-sm leading-relaxed text-zinc-600 mt-2">
              The call will end immediately. You can save the recording to Blob
              storage or end without saving.
            </p>
            <div className="mt-6 flex gap-2 justify-end">
              <Button
                variant="outline"
                className="rounded-full border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => setShowEndCallPrompt(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={handleEndWithoutSaving}
                disabled={isSaving}
              >
                End Without Saving
              </Button>
              <Button
                variant="destructive"
                className="rounded-full bg-red-600 text-white hover:bg-red-700"
                onClick={handleSaveAndExit}
                disabled={isSaving}
              >
                Save & End
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast.open && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`px-4 py-2 rounded-lg border text-sm shadow-lg ${toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
