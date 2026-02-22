import { useState, useRef, useCallback } from "react";

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const addedRemoteAudioTrackIdsRef = useRef<Set<string>>(new Set());

    const startRecording = useCallback(async (localStream: MediaStream) => {
        try {
            // Create AudioContext and explicitly RESUME it (required due to browser autoplay policy)
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            // Resume the audio context — browsers suspend it without a user gesture
            if (ctx.state === "suspended") {
                await ctx.resume();
                console.log("AudioContext resumed from suspended state");
            }

            const dest = ctx.createMediaStreamDestination();
            destinationRef.current = dest;

            // Add local audio (doctor or patient mic)
            const localAudioTracks = localStream.getAudioTracks();
            if (localAudioTracks.length > 0) {
                const localSource = ctx.createMediaStreamSource(localStream);
                localSource.connect(dest);
                console.log("Local audio track connected to recorder:", localAudioTracks[0].label);
            } else {
                console.warn("No local audio tracks found in stream");
            }

            // Use a MIME type that is widely supported
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "";

            const mediaRecorder = mimeType
                ? new MediaRecorder(dest.stream, { mimeType })
                : new MediaRecorder(dest.stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            addedRemoteAudioTrackIdsRef.current.clear();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log(`[Recorder] Chunk captured: ${event.data.size} bytes. Total chunks: ${audioChunksRef.current.length}`);
                } else {
                    console.warn("[Recorder] Received empty or invalid chunk");
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error("[Recorder] MediaRecorder error:", event);
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            console.log("[Recorder] Audio recording started. State:", mediaRecorder.state);
        } catch (err) {
            console.error("[Recorder] Failed to start audio recording:", err);
        }
    }, []);

    const addRemoteStream = useCallback((remoteStream: MediaStream) => {
        if (!audioContextRef.current || !destinationRef.current) {
            console.warn("[Recorder] Cannot add remote stream — AudioContext not initialized yet");
            return;
        }

        const remoteAudioTracks = remoteStream.getAudioTracks();
        if (remoteAudioTracks.length === 0) {
            console.warn("[Recorder] No audio tracks found in remote stream");
            return;
        }

        const hasNewAudioTrack = remoteAudioTracks.some(
            (track) => !addedRemoteAudioTrackIdsRef.current.has(track.id)
        );

        if (!hasNewAudioTrack) {
            console.log("[Recorder] Remote audio stream already connected, skipping duplicate connect");
            return;
        }

        try {
            const remoteSource = audioContextRef.current.createMediaStreamSource(remoteStream);
            remoteSource.connect(destinationRef.current);
            remoteAudioTracks.forEach((track) => addedRemoteAudioTrackIdsRef.current.add(track.id));
            console.log("[Recorder] Remote audio mixed into recording:", remoteAudioTracks[0].label);
        } catch (e) {
            console.error("[Recorder] Error mixing remote stream:", e);
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;

            if (!recorder) {
                console.warn("[Recorder] stopRecording called but audio recording was never started (mediaRecorderRef is null). This is expected if the call never connected.");
                resolve(null);
                return;
            }

            console.log("[Recorder] stopRecording called. Current state:", recorder.state, "Chunks:", audioChunksRef.current.length);

            if (recorder.state === "inactive") {
                console.warn("[Recorder] Recorder already inactive. Attempting to create blob from current chunks.");
                if (audioChunksRef.current.length > 0) {
                    const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
                    resolve(blob);
                } else {
                    resolve(null);
                }
                return;
            }

            recorder.onstop = () => {
                const chunks = audioChunksRef.current;
                console.log(`[Recorder] Recording stopped. Captured ${chunks.length} chunks.`);

                if (chunks.length === 0) {
                    console.error("[Recorder] No audio chunks captured! The recording was empty.");
                    resolve(null);
                    return;
                }

                const mimeType = recorder.mimeType || "audio/webm";
                const audioBlob = new Blob(chunks, { type: mimeType });
                console.log(`[Recorder] Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

                setIsRecording(false);
                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(console.error);
                }
                addedRemoteAudioTrackIdsRef.current.clear();
                resolve(audioBlob);
            };

            recorder.stop();
        });
    }, []);

    return {
        isAudioRecording: isRecording,
        startAudioRecording: startRecording,
        addRemoteStreamToRecording: addRemoteStream,
        stopAudioRecording: stopRecording,
    };
}
